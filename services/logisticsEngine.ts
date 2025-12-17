import { Product, Container, OptimizationPriority, LoadedContainer } from "../types";
import moment from 'moment';

const normalize = (s: string) => s.trim().toLowerCase();

// Calculate how "large" a container is (sum of capacities as a rough heuristic for sorting)
const getContainerCapacityScore = (c: Container) =>
  Object.values(c.capacities).reduce((sum, val) => sum + val, 0);

// Calculate Percentage of Container (PoC) for a single unit of a product
// Returns 0-1 scale (e.g. 0.05 for 5%)
const getPoC = (product: Product, container: Container): number => {
  const cap = container.capacities[product.formFactorId];
  if (!cap || cap <= 0) return 0;
  return 1 / cap;
};

export const checkCompatibility = (
  product: Product,
  container: Container,
  existingWeight: number = 0,
  weightLimit?: number
): string[] => {
  const issues: string[] = [];

  // 1. Check Form Factor Capacity
  if (!container.capacities[product.formFactorId]) {
    issues.push(`Container cannot hold form factor: ${product.formFactorId}`);
  }

  // 2. Check Restrictions
  // Logic: Container must have ALL capabilities required by the product.
  // If product has no restrictions, it fits in any container (assuming physical fit).
  if (product.restrictions.length > 0) {
    const containerCaps = new Set(container.restrictions.map(normalize));
    const missingCaps = product.restrictions.filter(req => !containerCaps.has(normalize(req)));
    if (missingCaps.length > 0) {
      issues.push(`Missing capabilities: ${missingCaps.join(', ')}`);
    }
  }

  // 3. Check Destination
  const pDest = normalize(product.destination || '');
  const cDest = normalize(container.destination || '');

  // If container has a specific destination, product must match it.
  // If container is generic (empty destination), it can go anywhere.
  if (cDest && pDest && pDest !== cDest) {
    issues.push(`Destination mismatch: Product to ${product.destination}, Container to ${container.destination}`);
  }

  // 4. Check Weight Limit (if configured)
  if (weightLimit !== undefined && product.weight !== undefined) {
    const productTotalWeight = product.weight;
    if (existingWeight + productTotalWeight > weightLimit) {
      issues.push(`Weight limit exceeded: ${(existingWeight + productTotalWeight).toFixed(1)}kg > ${weightLimit}kg`);
    }
  }

  // 5. Check Dates
  const containerAvailTime = new Date(container.availableFrom).getTime();
  const containerArriveTime = containerAvailTime + (container.transitTimeDays * 24 * 60 * 60 * 1000);

  // Check if product is ready before container departs
  if (product.readyDate) {
    const readyTime = new Date(product.readyDate).getTime();
    if (containerAvailTime < readyTime) {
      issues.push(`Container departs (${container.availableFrom}) before product is ready (${product.readyDate})`);
    }
  }

  if (product.shipDeadline) {
    const shipDead = new Date(product.shipDeadline).getTime();
    if (containerAvailTime > shipDead) {
      issues.push(`Ships after deadline (${product.shipDeadline})`);
    }
  }

  if (product.arrivalDeadline) {
    const arriveDead = new Date(product.arrivalDeadline).getTime();
    if (containerArriveTime > arriveDead) {
      issues.push(`Arrives after deadline (${product.arrivalDeadline})`);
    }
  }

  return issues;
};

// Validates a fully packed container and calculates final stats
export const validateLoadedContainer = (
  container: Container,
  products: Product[],
  weightLimit?: number,
  _allowUnitSplitting: boolean = true,
  shippingDateGroupingRange: number | undefined = undefined,
  _respectCurrentAssignments: boolean = false
): LoadedContainer => {

  const parseDate = (d?: string): number => {
    if (!d) return 0;
    const parsedDate = moment(d, ["DD/MM/YYYY", "DD-MM-YYYY"]).toDate();
    return isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  };

  let totalUtilization = 0;
  let totalWeight = 0;
  const issues: string[] = [];

  // Calculate Utilization and Weight
  products.forEach(p => {
    const maxCap = container.capacities[p.formFactorId];
    if (!maxCap) {
      issues.push(`${p.name}: Container does not support form factor ${p.formFactorId}`);
    } else {
      const utilizationContribution = (p.quantity / maxCap) * 100;
      totalUtilization += utilizationContribution;
    }

    // Track total weight
    if (p.weight !== undefined) {
      totalWeight += p.weight;
    }

    const productIssues = checkCompatibility(p, container);
    if (productIssues.length > 0) {
      issues.push(`${p.name}: ${productIssues.join(', ')}`);
    }
  });

  // Allow a small tolerance (0.1%) for floating-point rounding errors
  if (totalUtilization > 100.1) {
    issues.push(`Overfilled: ${totalUtilization.toFixed(1)}%`);
  }

  // Check weight limit
  if (weightLimit !== undefined && totalWeight > weightLimit) {
    issues.push(`Weight limit exceeded: ${totalWeight.toFixed(1)}kg > ${weightLimit}kg`);
  }

  // Check shipping date grouping (dates too far apart)
  if (shippingDateGroupingRange !== undefined && products.length > 1) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const groupingRangeMs = shippingDateGroupingRange * MS_PER_DAY;

    // Get all valid dates from products
    const productDates = products
      .map(p => ({ name: p.name, dateMs: parseDate(p.shippingAvailableBy) }))
      .filter(p => p.dateMs > 0);

    if (productDates.length > 1) {
      // Find min and max dates
      const minDate = Math.min(...productDates.map(p => p.dateMs));
      const maxDate = Math.max(...productDates.map(p => p.dateMs));
      const dateSpread = maxDate - minDate;

      if (dateSpread > groupingRangeMs) {
        const daysDiff = Math.ceil(dateSpread / MS_PER_DAY);
        issues.push(`Shipping dates span ${daysDiff} days (configured max: ${shippingDateGroupingRange} days)`);
      }
    }
  }

  return {
    container,
    assignedProducts: products,
    totalUtilization,
    validationIssues: issues
  };
};

// Helper to check if a list of products fits in a container template
const canFit = (products: Product[], container: Container, weightLimit?: number): boolean => {
  let totalUtilization = 0;
  let totalWeight = 0;
  for (const p of products) {
    const maxCap = container.capacities[p.formFactorId];
    if (!maxCap) return false;

    const issues = checkCompatibility(p, container);
    if (issues.length > 0) return false;

    totalUtilization += (p.quantity / maxCap) * 100;
    if (p.weight !== undefined) {
      totalWeight += p.weight;
    }
  }

  // Check weight limit if configured
  if (weightLimit !== undefined && totalWeight > weightLimit) {
    return false;
  }

  return totalUtilization <= 100.1;
};

// --- Core Packing Logic (Greedy) ---
// Returns a list of raw container instances (unvalidated)
const packItems = (
  products: Product[],
  templates: Container[],
  maxUtilization: number = 100,
  getWeightLimitForContainer: (templateId: string, currentWeight: number, countryCode?: string) => number | undefined, // Added countryCode
  allowUnitSplitting: boolean = true,
  existingPackedInstances: Array<{ template: Container; assigned: Product[]; currentUtil: number; currentWeight: number }> = []
): Array<{ template: Container; assigned: Product[]; currentUtil: number; currentWeight: number }> => {

  if (templates.length === 0 && existingPackedInstances.length === 0) return [];

  const packedInstances: Array<{ template: Container; assigned: Product[]; currentUtil: number; currentWeight: number }> = [...existingPackedInstances];
  const unassigned: Product[] = [];

  for (const product of products) {
    let remainingQty = product.quantity;
    const totalLineWeight = product.weight ?? 0;
    const unitWeight = product.quantity > 0 ? totalLineWeight / product.quantity : 0;
    const productCountry = product.country; // Get product's country for lookups

    // Phase A: Try to fill *existing* or *last opened* container first (Next Fit)
    // Prioritize existing containers if any are available and compatible

    // Try to find the best existing container for the product
    // Sort existing instances by available space (descending) to fill the emptiest ones first
    const compatibleExistingInstances = packedInstances
      .filter(inst => {
        const maxCap = inst.template.capacities[product.formFactorId];
        if (!maxCap) return false;
        // Check if product is compatible with this specific container instance
        if (checkCompatibility(product, inst.template).length > 0) return false;
        // Check if there's any space left at all (allowing for small float tolerance)
        return inst.currentUtil < (maxUtilization + 0.1);
      })
      .sort((a, b) => (b.currentUtil - a.currentUtil)); // Sort by utilization (least utilized first to fill better)

    // Try to fill the least utilized compatible existing instance
    for (const currentInstance of compatibleExistingInstances) {
      const maxCap = currentInstance.template.capacities[product.formFactorId];
      // Pass productCountry to getWeightLimitForContainer
      const weightLimit = getWeightLimitForContainer(currentInstance.template.id, currentInstance.currentWeight, productCountry);

      // Check if at least 1 unit fits by weight
      const canFitWeightInitially = weightLimit === undefined ||
        (currentInstance.currentWeight + unitWeight <= weightLimit);

      if (!canFitWeightInitially) continue; // Cannot fit even one unit

      const spacePercent = (maxUtilization + 0.1) - currentInstance.currentUtil;
      let maxQtyThatFits = Math.floor((spacePercent / 100) * maxCap);

      // Also limit by weight if configured
      if (weightLimit !== undefined && unitWeight > 0) {
        const remainingWeightCapacity = weightLimit - currentInstance.currentWeight;
        maxQtyThatFits = Math.min(maxQtyThatFits, Math.floor(remainingWeightCapacity / unitWeight));
      }

      if (maxQtyThatFits > 0) {
        let take = 0;
        if (allowUnitSplitting) {
          take = Math.min(maxQtyThatFits, remainingQty);
        } else {
          if (maxQtyThatFits >= remainingQty) {
            take = remainingQty;
          }
        }

        if (take > 0) {
          const assignedWeight = unitWeight * take;
          currentInstance.assigned.push({ ...product, quantity: take, weight: assignedWeight });
          currentInstance.currentUtil += (take / maxCap) * 100;
          currentInstance.currentWeight += assignedWeight;
          remainingQty -= take;
          if (remainingQty <= 0) break; // Product fully assigned
        }
      }
    }


    // Phase B: If still items left, open new containers
    while (remainingQty > 0) {
      // Find the best template for THIS product
      // Since products are sorted by Restricted -> Standard, this ensures that if the current
      // product is Restricted, we pick a container that supports it (e.g. Reefer).
      const bestTemplate = templates.find(t => {
        if (!t.capacities[product.formFactorId]) return false;
        if (checkCompatibility(product, t).length > 0) return false;

        // Check if it can hold at least one unit by weight (assuming empty for new container)
        // Pass productCountry to getWeightLimitForContainer
        const limit = getWeightLimitForContainer(t.id, 0, productCountry);
        if (limit !== undefined && unitWeight > limit) return false;

        // If unit splitting disabled, check if WHOLE qty fits
        if (!allowUnitSplitting) {
          const cap = t.capacities[product.formFactorId];
          if (cap < remainingQty) return false;

          if (limit !== undefined) {
            if ((unitWeight * remainingQty) > limit) return false;
          }
        }

        return true;
      });

      if (!bestTemplate) {
        // Cannot fit anywhere
        unassigned.push({ ...product, quantity: remainingQty, weight: (product.weight && product.quantity > 0) ? (product.weight / product.quantity) * remainingQty : 0 });
        break;
      }

      const maxCap = bestTemplate.capacities[product.formFactorId];
      // Pass productCountry to getWeightLimitForContainer
      const weightLimit = getWeightLimitForContainer(bestTemplate.id, 0, productCountry);

      // Calculate how many units can fit considering weight limit
      let maxByCapacity = maxCap;
      if (weightLimit !== undefined && unitWeight > 0) {
        maxByCapacity = Math.min(maxCap, Math.floor(weightLimit / unitWeight));
      }

      // Safety check: maxByCapacity should be >= 1 because we filtered templates above
      if (maxByCapacity < 1) {
        unassigned.push({ ...product, quantity: remainingQty, weight: unitWeight * remainingQty });
        break;
      }

      let take = 0;
      if (allowUnitSplitting) {
        take = Math.min(maxByCapacity, remainingQty);
      } else {
        if (maxByCapacity >= remainingQty) {
          take = remainingQty;
        } else {
          unassigned.push({ ...product, quantity: remainingQty, weight: unitWeight * remainingQty });
          break;
        }
      }

      const assignedWeight = unitWeight * take;

      // Create new instance
      packedInstances.push({
        template: bestTemplate,
        assigned: [{ ...product, quantity: take, weight: assignedWeight }],
        currentUtil: (take / maxCap) * 100,
        currentWeight: assignedWeight
      });

      remainingQty -= take;
    }
  }

  return packedInstances;
};


// --- Main Calculation Function ---

export const calculatePacking = (
  products: Product[],
  containers: Container[],
  _priority: OptimizationPriority,
  _minUtilization: number = 70,
  countryCosts: Record<string, Record<string, number>> = {},
  maxUtilization: number = 100,
  countryWeightLimits: Record<string, Record<string, number>> = {},
  allowUnitSplitting: boolean = true,
  shippingDateGroupingRange: number | undefined = undefined,
  respectCurrentAssignments: boolean = false
): { assignments: LoadedContainer[]; unassigned: Product[] } => {

  const parseDate = (d?: string) => {
    if (!d) return 0;
    const parsedDate = moment(d, ["DD/MM/YYYY", "DD-MM-YYYY"]).toDate();
    return isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  };

  let finalAssignments: LoadedContainer[] = [];
  let remainingProducts = products.map(p => ({ ...p }));
  let instanceCounter = 0;

  let initialPackedInstances: Array<{ template: Container; assigned: Product[]; currentUtil: number; currentWeight: number }> = [];

  if (respectCurrentAssignments) {
    const getRef = (p: Product): string => {
      return p.assignmentReference || (p as any).data?.assignmentReference || '';
    };
    const getContainer = (p: Product): string => {
      return p.currentContainer || (p as any).data?.currentContainer || '';
    };

    const isHardReference = (ref: string): boolean => {
      if (!ref || ref.trim().length === 0) return false;
      const r = ref.trim();
      return !r.startsWith('packter-') && !r.includes('_LINK_packter-');
    };

    const initiallyAssignedProducts = remainingProducts.filter(p => {
      const container = getContainer(p);
      const ref = getRef(p);
      const isHard = isHardReference(ref);
      return container.trim().length > 0 && isHard;
    });

    remainingProducts = remainingProducts.filter(p => {
      const container = getContainer(p);
      const ref = getRef(p);
      const isHard = isHardReference(ref);
      return container.trim().length === 0 || !isHard;
    });

    const findTemplate = (desc: string): Container | undefined => {
      if (!desc) return undefined;
      const d = desc.toLowerCase().trim();

      const exactMatch = containers.find(c =>
        c.id.toLowerCase() === d || c.name.toLowerCase() === d
      );
      if (exactMatch) return exactMatch;

      const sortedContainers = [...containers].sort((a, b) => b.name.length - a.name.length);

      return sortedContainers.find(c => {
        const cName = c.name.toLowerCase();
        const cId = c.id.toLowerCase();
        return (cName.length > 0 && d.includes(cName)) || (cId.length > 0 && d.includes(cId));
      });
    };

    const groupedAssigned: Record<string, Product[]> = {};
    initiallyAssignedProducts.forEach(p => {
      const containerInstanceId = (p as any)._containerInstanceId || (p as any).data?._containerInstanceId;
      let groupRef: string;

      if (containerInstanceId) {
        groupRef = containerInstanceId;
      } else if (p.assignmentReference && p.assignmentReference.trim().length > 0) {
        const rawRef = p.assignmentReference.trim();
        groupRef = rawRef.split('_LINK_')[0];
      } else {
        groupRef = 'bulk';
      }

      const key = `${p.currentContainer}|${p.destination}|${groupRef}`;
      if (!groupedAssigned[key]) groupedAssigned[key] = [];
      groupedAssigned[key].push(p);
    });

    Object.entries(groupedAssigned).forEach(([key, groupProducts]) => {
      const [containerDesc, _dest, ref] = key.split('|');
      const template = findTemplate(containerDesc);

      if (template) {
        instanceCounter++;
        const isSpecificInstance = ref !== 'bulk';
        const newInstance: Container = {
          ...template,
          id: isSpecificInstance ? `${template.id}-SHIPMENT-${ref}` : `${template.id}-existing-${instanceCounter}`,
          name: isSpecificInstance ? `${template.name} (${ref})` : template.name,
          destination: groupProducts[0].destination
        };

        const weightLimit = groupProducts[0].country
          ? countryWeightLimits[groupProducts[0].country]?.[template.id]
          : undefined;

        const validatedLc = validateLoadedContainer(
          newInstance,
          groupProducts,
          weightLimit,
          allowUnitSplitting,
          shippingDateGroupingRange,
          true
        );

        initialPackedInstances.push({
          template: validatedLc.container,
          assigned: validatedLc.assignedProducts,
          currentUtil: validatedLc.totalUtilization,
          currentWeight: validatedLc.assignedProducts.reduce((sum, p) => sum + (p.weight || 0), 0)
        });

      } else {
        remainingProducts.push(...groupProducts);
      }
    });
  }

  // 1. Group Products by Destination AND Date Buckets (if configured)
  function groupProductsByDestinationAndFlexibleDate(
    allProducts: Product[],
    shippingDateGroupingRangeDays: number | undefined
  ): Record<string, { products: Product[], destination: string }> {

    const intermediateDestinationGroupedProducts: Record<string, { products: Product[], destination: string }> = {};

    allProducts.forEach(p => {
      const destRaw = p.destination || '';
      const destNorm = normalize(destRaw);
      const groupKey = destNorm || 'unknown';

      if (!intermediateDestinationGroupedProducts[groupKey]) {
        intermediateDestinationGroupedProducts[groupKey] = {
          products: [],
          destination: destRaw
        };
      }
      intermediateDestinationGroupedProducts[groupKey].products.push(p);
    });

    if (shippingDateGroupingRangeDays === undefined) {
      return intermediateDestinationGroupedProducts;
    }

    const finalCombinedProductGroups: Record<string, { products: Product[], destination: string }> = {};
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const groupingRangeMs = shippingDateGroupingRangeDays * MS_PER_DAY;

    for (const destinationGroupKey in intermediateDestinationGroupedProducts) {
      if (Object.prototype.hasOwnProperty.call(intermediateDestinationGroupedProducts, destinationGroupKey)) {
        const { products: productsForThisDestination, destination: actualDestination } =
          intermediateDestinationGroupedProducts[destinationGroupKey];

        const productsWithParsedDates = productsForThisDestination
          .map(p => ({
            ...p,
            _shippingDateMs: parseDate(p.shippingAvailableBy)
          }))
          .filter(p => !isNaN(p._shippingDateMs) && p._shippingDateMs > 0)
          .sort((a, b) => a._shippingDateMs - b._shippingDateMs);

        if (productsWithParsedDates.length === 0) {
          continue;
        }

        let currentFlexibleDateGroup: (Product & { _shippingDateMs: number })[] = [];
        let dateGroupCounter = 0;

        for (let i = 0; i < productsWithParsedDates.length; i++) {
          const product = productsWithParsedDates[i];

          if (currentFlexibleDateGroup.length === 0) {
            currentFlexibleDateGroup.push(product);
          } else {
            const earliestDateInCurrentGroup = currentFlexibleDateGroup[0]._shippingDateMs;
            if (product._shippingDateMs - earliestDateInCurrentGroup <= groupingRangeMs) {
              currentFlexibleDateGroup.push(product);
            } else {
              const combinedKey = `${destinationGroupKey}__dateGroup_${dateGroupCounter}`;
              finalCombinedProductGroups[combinedKey] = {
                products: currentFlexibleDateGroup.map(({ _shippingDateMs, ...rest }) => rest),
                destination: actualDestination,
              };
              dateGroupCounter++;
              currentFlexibleDateGroup = [product];
            }
          }
        }

        if (currentFlexibleDateGroup.length > 0) {
          const combinedKey = `${destinationGroupKey}__dateGroup_${dateGroupCounter}`;
          finalCombinedProductGroups[combinedKey] = {
            products: currentFlexibleDateGroup.map(({ _shippingDateMs, ...rest }) => rest),
            destination: actualDestination,
          };
        }
      }
    }

    return finalCombinedProductGroups;
  }

  const productGroups = groupProductsByDestinationAndFlexibleDate(remainingProducts, shippingDateGroupingRange);

  const allUnassigned: Product[] = [];

  let currentPackedInstancesForOptimization = [...initialPackedInstances];

  for (const group of Object.values(productGroups)) {

    const compatibleTemplates = containers.filter(c => {
      const cDest = normalize(c.destination || '');
      const gDest = normalize(group.destination);
      if (cDest && cDest !== gDest) return false;
      return true;
    });

    if (compatibleTemplates.length === 0 && currentPackedInstancesForOptimization.filter(inst => normalize(inst.template.destination || '') === normalize(group.destination)).length === 0) {
      allUnassigned.push(...group.products);
      continue;
    }

    const groupCountry = group.products[0]?.country;

    const sortedTemplates = [...compatibleTemplates].sort((a, b) => {
      const capA = getContainerCapacityScore(a);
      const capB = getContainerCapacityScore(b);
      if (capA !== capB) return capB - capA;

      // Use country-specific cost for sorting templates
      const costA = (groupCountry && countryCosts[groupCountry]?.[a.id]) ?? a.cost;
      const costB = (groupCountry && countryCosts[groupCountry]?.[b.id]) ?? b.cost;
      return costA - costB;
    });

    const largestTemplate = sortedTemplates[0];

    const restrictedProducts = group.products.filter(p => p.restrictions.length > 0);
    const standardProducts = group.products.filter(p => p.restrictions.length === 0);

    const sortByPoC = (a: Product, b: Product) => {
      const pocA = getPoC(a, largestTemplate);
      const pocB = getPoC(b, largestTemplate);
      return pocB - pocA;
    };

    restrictedProducts.sort(sortByPoC);
    standardProducts.sort(sortByPoC);
    const sortedProducts = [...restrictedProducts, ...standardProducts];

    // Define the getWeightLimitForContainer resolver for this group
    const getWeightLimitForContainer = (templateId: string, currentWeight: number, countryCode?: string): number | undefined => {
      if (!countryCode) return undefined;
      return countryWeightLimits[countryCode]?.[templateId];
    };

    const existingInstancesForThisGroup = currentPackedInstancesForOptimization
      .filter(inst => normalize(inst.template.destination || '') === normalize(group.destination));

    const packedInstances = packItems(
      sortedProducts,
      sortedTemplates,
      maxUtilization,
      getWeightLimitForContainer, // Pass the resolver
      allowUnitSplitting,
      existingInstancesForThisGroup
    );

    currentPackedInstancesForOptimization = currentPackedInstancesForOptimization
      .filter(inst => normalize(inst.template.destination || '') !== normalize(group.destination));
    currentPackedInstancesForOptimization.push(...packedInstances);

    console.log(`Packed instances after initial fill/new container for group (temp state):`, packedInstances);
  }

  // Phase 2: Optimization Loop (Applied globally now)
  if (currentPackedInstancesForOptimization.length > 0) {
    // Step A: Downsize Remainder (apply to each container individually)
    for (let i = 0; i < currentPackedInstancesForOptimization.length; i++) {
      const instance = currentPackedInstancesForOptimization[i];
      let bestReplacement = instance.template;
      const instanceProductsCountry = instance.assigned.length > 0 ? instance.assigned[0].country : undefined;

      // Use country-specific cost for current instance
      let bestCost = (instanceProductsCountry && countryCosts[instanceProductsCountry]?.[instance.template.id]) ?? instance.template.cost;
      let foundBetter = false;

      const compatibleTemplatesForDownsizing = containers.filter(t =>
        normalize(t.destination || '') === normalize(instance.template.destination || '') &&
        instance.assigned.every(p => checkCompatibility(p, t).length === 0)
      );

      for (const t of compatibleTemplatesForDownsizing) {
        // Use country-specific weight limit and cost for candidate replacement templates
        const tWeightLimit = (instanceProductsCountry && countryWeightLimits[instanceProductsCountry]?.[t.id]);
        const tCost = (instanceProductsCountry && countryCosts[instanceProductsCountry]?.[t.id]) ?? t.cost;
        if (tCost < bestCost && canFit(instance.assigned, t, tWeightLimit)) {
          bestReplacement = t;
          bestCost = tCost;
          foundBetter = true;
        }
      }

      if (foundBetter) {
        currentPackedInstancesForOptimization[i].template = bestReplacement;
      }
    }
  }

  // 7. Finalize Output
  currentPackedInstancesForOptimization.forEach(inst => {
    instanceCounter++;
    const instanceContainer = {
      ...inst.template,
      id: `${inst.template.id}-instance-${instanceCounter}`,
      destination: inst.template.destination || (inst.assigned.length > 0 ? inst.assigned[0].destination : undefined)
    };

    const groupCountry = inst.assigned[0]?.country;
    const weightLimitForTemplate = (groupCountry && countryWeightLimits[groupCountry]?.[inst.template.id]);

    const validatedContainer = validateLoadedContainer(
      instanceContainer,
      inst.assigned,
      weightLimitForTemplate,
      allowUnitSplitting,
      shippingDateGroupingRange,
      respectCurrentAssignments
    );
    finalAssignments.push(validatedContainer);
  });

  return {
    assignments: finalAssignments,
    unassigned: allUnassigned
  };
};