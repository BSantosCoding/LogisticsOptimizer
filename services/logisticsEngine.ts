import { Product, Container, OptimizationPriority, LoadedContainer } from "../types";
import moment from 'moment';

const normalize = (s: string) => s.trim().toLowerCase();

// --- Helper Functions ---

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
    // product.weight is TOTAL weight for the line item
    // We need to calculate the weight of the specific quantity being checked?
    // Actually, checkCompatibility is usually called with a product object that has a specific quantity.
    // BUT, if the product object passed here is a "slice" (e.g. quantity=1), does it have the weight of 1 unit or the original total?
    // The engine creates slices. We need to ensure when we create a slice, we adjust the weight.
    // If we do that, then product.weight HERE is the total weight of THIS slice.

    // However, to be safe and consistent with the new logic:
    // We assume the caller has already adjusted the weight for the slice, OR we calculate unit weight if we have context.
    // But checkCompatibility doesn't know about the "original" quantity.
    // So we must enforce that any Product object passed around has its .weight property matching its .quantity.

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
  weightLimit?: number
): LoadedContainer => {

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
      totalWeight += p.weight; // p.weight is now total weight for this assignment
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
      totalWeight += p.weight; // p.weight is total for this slice
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
  weightLimitResolver: (templateId: string) => number | undefined,
  allowUnitSplitting: boolean = true
): Array<{ template: Container; assigned: Product[] }> => {

  if (templates.length === 0) return [];

  // templates are assumed to be sorted by Preference (usually Capacity Desc, Cost Asc)

  const packedInstances: Array<{ template: Container; assigned: Product[]; currentUtil: number; currentWeight: number }> = [];
  const unassigned: Product[] = [];

  // Logic:
  // 1. Loop through products (which are sorted by Priority/Difficulty).
  // 2. Try to fit 'qty' into current open container.
  // 3. If it doesn't fit completely, fill current, then open new Largest Compatible.

  for (const product of products) {
    let remainingQty = product.quantity;

    // Phase A: Try to fill the *last opened* container first (Next Fit)
    if (packedInstances.length > 0) {
      const currentInstance = packedInstances[packedInstances.length - 1];
      const maxCap = currentInstance.template.capacities[product.formFactorId];

      // Check if product is compatible with this specific container instance
      // Standard products will usually be compatible with Specialized containers (e.g. Reefer)
      // so this allows mixed packing.
      if (maxCap && checkCompatibility(product, currentInstance.template).length === 0) {
        // Also check weight limit if configured
        const totalLineWeight = product.weight ?? 0;
        const unitWeight = product.quantity > 0 ? totalLineWeight / product.quantity : 0;

        const weightLimit = weightLimitResolver(currentInstance.template.id);
        const canFitWeight = weightLimit === undefined ||
          (currentInstance.currentWeight + unitWeight <= weightLimit); // Check if at least 1 unit fits

        if (canFitWeight) {
          const spacePercent = (maxUtilization + 0.1) - currentInstance.currentUtil;
          const maxQtyThatFits = Math.floor((spacePercent / 100) * maxCap);

          // Also limit by weight if configured
          let qtyByWeight = maxQtyThatFits;
          if (weightLimit !== undefined && unitWeight > 0) {
            const remainingWeightCapacity = weightLimit - currentInstance.currentWeight;
            qtyByWeight = Math.floor(remainingWeightCapacity / unitWeight);
          }

          const maxQtyAllowed = Math.min(maxQtyThatFits, qtyByWeight);

          if (maxQtyAllowed > 0) {
            let take = 0;
            if (allowUnitSplitting) {
              take = Math.min(maxQtyAllowed, remainingQty);
            } else {
              // only take if ALL remaining fits
              if (maxQtyAllowed >= remainingQty) {
                take = remainingQty;
              }
            }

            if (take > 0) {
              // Create assigned product with proportional weight
              const assignedWeight = unitWeight * take;
              currentInstance.assigned.push({ ...product, quantity: take, weight: assignedWeight });
              currentInstance.currentUtil += (take / maxCap) * 100;
              currentInstance.currentWeight += assignedWeight;
              remainingQty -= take;
            }
          }
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

        // Check if it can hold at least one unit by weight
        const limit = weightLimitResolver(t.id);
        const totalLineWeight = product.weight ?? 0;
        const unitWeight = product.quantity > 0 ? totalLineWeight / product.quantity : 0;

        if (limit !== undefined && unitWeight > limit) return false;

        // If unit splitting disabled, check if WHOLE qty fits
        if (!allowUnitSplitting) {
          // We need to check if the new container can hold the ENTIRE remaining quantity
          // Note: We are finding a NEW container, so capacity is empty (except for base weight if any?)
          // Capacity for FF
          const cap = t.capacities[product.formFactorId];
          if (cap < remainingQty) return false;

          // Weight limit
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
      const weightLimit = weightLimitResolver(bestTemplate.id);

      const totalLineWeight = product.weight ?? 0;
      const unitWeight = product.quantity > 0 ? totalLineWeight / product.quantity : 0;

      // Calculate how many units can fit considering weight limit
      let maxByCapacity = maxCap;
      if (weightLimit !== undefined && unitWeight > 0) {
        maxByCapacity = Math.min(maxCap, Math.floor(weightLimit / unitWeight));
      }

      // Safety check: maxByCapacity should be >= 1 because we filtered templates above
      // But just in case of floating point weirdness
      if (maxByCapacity < 1) {
        unassigned.push({ ...product, quantity: remainingQty, weight: unitWeight * remainingQty });
        break;
      }

      let take = 0;
      if (allowUnitSplitting) {
        take = Math.min(maxByCapacity, remainingQty);
      } else {
        // If we are here, we already checked in 'find' loop that it fits, but let's double check
        if (maxByCapacity >= remainingQty) {
          take = remainingQty;
        } else {
          // Should not happen if filter logic is correct, but safe fallback
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

  return packedInstances.map(p => ({ template: p.template, assigned: p.assigned }));
};


// --- Main Calculation Function ---

export const calculatePacking = (
  products: Product[],
  containers: Container[],
  priority: OptimizationPriority,
  minUtilization: number = 70,
  countryCosts: Record<string, Record<string, number>> = {}, // countryCode -> containerTemplateId -> cost
  maxUtilization: number = 100,
  countryWeightLimits: Record<string, Record<string, number>> = {}, // countryCode -> containerTemplateId -> weightLimit
  allowUnitSplitting: boolean = true,
  shippingDateGroupingRange: number | undefined = undefined
): { assignments: LoadedContainer[]; unassigned: Product[] } => {

  // Helper to parse date string "MM/DD/YYYY" safely
  const parseDate = (d?: string) => {
    if (!d) {
      return 0;
    }
    // Assuming MM/DD/YYYY format. Adjust format string to 'dd/MM/yyyy' if your dates are DD/MM/YYYY.
    const parsedDate = moment(d).toDate();
    return isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  };

  // 1. Group Products by Destination AND Date Buckets (if configured)
  function groupProductsByDestinationAndFlexibleDate(
    allProducts: Product[],
    shippingDateGroupingRangeDays: number
  ): Record<string, { products: Product[], destination: string }> {

    // Step 1: Initial grouping by destination (using your existing logic)
    const intermediateDestinationGroupedProducts: Record<string, { products: Product[], destination: string }> = {};

    allProducts.forEach(p => {
      const destRaw = p.destination || '';
      const destNorm = normalize(destRaw); // Your existing normalize function
      let groupKey = destNorm || 'unknown'; // This 'groupKey' is purely for the destination at this stage

      if (!intermediateDestinationGroupedProducts[groupKey]) {
        intermediateDestinationGroupedProducts[groupKey] = {
          products: [],
          destination: destRaw // Keep the raw destination for the group info
        };
      }
      intermediateDestinationGroupedProducts[groupKey].products.push(p);
    });

    if (shippingDateGroupingRangeDays === undefined) {
      return intermediateDestinationGroupedProducts;
    }

    // Step 2: Apply flexible date grouping to EACH intermediate destination group
    const finalCombinedProductGroups: Record<string, { products: Product[], destination: string }> = {};
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const groupingRangeMs = shippingDateGroupingRangeDays * MS_PER_DAY;

    for (const destinationGroupKey in intermediateDestinationGroupedProducts) {
      if (intermediateDestinationGroupedProducts.hasOwnProperty(destinationGroupKey)) {
        const { products: productsForThisDestination, destination: actualDestination } =
          intermediateDestinationGroupedProducts[destinationGroupKey];

        // Filter and sort products for date grouping
        const productsWithParsedDates = productsForThisDestination
          .map(p => ({
            ...p,
            _shippingDateMs: parseDate(p.shippingAvailableBy)
          }))
          .filter(p => !isNaN(p._shippingDateMs) && p._shippingDateMs > 0)
          .sort((a, b) => a._shippingDateMs - b._shippingDateMs);

        if (productsWithParsedDates.length === 0) {
          // If no valid products after filtering, skip this destination group
          continue;
        }

        // Apply the flexible date grouping logic
        let currentFlexibleDateGroup: (Product & { _shippingDateMs: number })[] = [];
        let dateGroupCounter = 0; // To generate unique dateGroupKeys within this destination

        for (let i = 0; i < productsWithParsedDates.length; i++) {
          const product = productsWithParsedDates[i];

          if (currentFlexibleDateGroup.length === 0) {
            currentFlexibleDateGroup.push(product);
          } else {
            const earliestDateInCurrentGroup = currentFlexibleDateGroup[0]._shippingDateMs;
            if (product._shippingDateMs - earliestDateInCurrentGroup <= groupingRangeMs) {
              currentFlexibleDateGroup.push(product);
            } else {
              // Current flexible date group is complete, add it to final output
              const combinedKey = `${destinationGroupKey}__dateGroup_${dateGroupCounter}`;
              finalCombinedProductGroups[combinedKey] = {
                products: currentFlexibleDateGroup.map(({ _shippingDateMs, ...rest }) => rest), // Remove temp _shippingDateMs
                destination: actualDestination,
              };
              dateGroupCounter++; // Increment for next date group
              currentFlexibleDateGroup = [product]; // Start new group
            }
          }
        }

        // Add the last flexible date group if it exists
        if (currentFlexibleDateGroup.length > 0) {
          const combinedKey = `${destinationGroupKey}__dateGroup_${dateGroupCounter}`;
          finalCombinedProductGroups[combinedKey] = {
            products: currentFlexibleDateGroup.map(({ _shippingDateMs, ...rest }) => rest), // Remove temp _shippingDateMs
            destination: actualDestination,
          };
        }
      }
    }

    return finalCombinedProductGroups;
  }

  const productGroups = groupProductsByDestinationAndFlexibleDate(products, shippingDateGroupingRange);
  console.log(productGroups)

  let allAssignments: LoadedContainer[] = [];
  const allUnassigned: Product[] = [];
  let instanceCounter = 0;

  // Process each group separately
  for (const group of Object.values(productGroups)) {

    // 2. Identify Compatible Templates for this group
    const compatibleTemplates = containers.filter(c => {
      const cDest = normalize(c.destination || '');
      const gDest = normalize(group.destination);
      // If container has a fixed destination, it must match.
      if (cDest && cDest !== gDest) return false;
      return true;
    });

    if (compatibleTemplates.length === 0) {
      allUnassigned.push(...group.products);
      continue;
    }

    // Get country from first product in group (all products in group have same destination/country)
    const groupCountry = group.products[0]?.country;

    // 3. Sort Templates: Largest Capacity First (Greedy Baseline)
    const sortedTemplates = [...compatibleTemplates].sort((a, b) => {
      const capA = getContainerCapacityScore(a);
      const capB = getContainerCapacityScore(b);
      if (capA !== capB) return capB - capA;

      // If capacity is the same, sort by cost (use country-specific cost if available)
      const costA = (groupCountry && countryCosts[groupCountry]?.[a.id]) ?? a.cost;
      const costB = (groupCountry && countryCosts[groupCountry]?.[b.id]) ?? b.cost;
      return costA - costB;
    });

    const largestTemplate = sortedTemplates[0];

    // 4. Sort Products
    // Strategy: Create 2 lists (Restricted vs Standard), sort both by PoC Descending, then start picking from Restricted first.
    const restrictedProducts = group.products.filter(p => p.restrictions.length > 0);
    const standardProducts = group.products.filter(p => p.restrictions.length === 0);

    const sortByPoC = (a: Product, b: Product) => {
      // PoC (Physical Size relative to largest container)
      const pocA = getPoC(a, largestTemplate);
      const pocB = getPoC(b, largestTemplate);
      return pocB - pocA; // Larger items first (Descending)
    };

    restrictedProducts.sort(sortByPoC);
    standardProducts.sort(sortByPoC);

    // Pack restricted items first. They will force open "special" containers (e.g. Reefers).
    // Then pack standard items. They will backfill the open specialized containers if space allows.
    const sortedProducts = [...restrictedProducts, ...standardProducts];

    // Get weight limit for this country/container combination
    const getWeightLimit = (templateId: string): number | undefined => {
      if (!groupCountry) return undefined;
      return countryWeightLimits[groupCountry]?.[templateId];
    };

    // 5. Phase 1: Greedy Packing
    let packedInstances = packItems(sortedProducts, sortedTemplates, maxUtilization, getWeightLimit, allowUnitSplitting);

    // 6. Phase 2: Optimization Loop
    if (packedInstances.length > 0) {

      // Step A: Downsize the Last Container (Remainder Check)
      const lastIdx = packedInstances.length - 1;
      const lastInstance = packedInstances[lastIdx];

      // Try to find a cheaper template that fits the assignments
      let bestReplacement = lastInstance.template;
      let bestCost = lastInstance.template.cost;
      let foundBetter = false;

      for (const t of sortedTemplates) {
        // Check if cost is lower AND strictly compatible with the items assigned
        const tWeightLimit = getWeightLimit(t.id);
        if (t.cost < bestCost && canFit(lastInstance.assigned, t, tWeightLimit)) {
          bestReplacement = t;
          bestCost = t.cost;
          foundBetter = true;
        }
      }

      if (foundBetter) {
        packedInstances[lastIdx].template = bestReplacement;
      }

      // Step B: Optimize Last Full + Remainder
      if (packedInstances.length >= 2) {
        const idxTail = packedInstances.length - 1;
        const idxPrev = packedInstances.length - 2;

        const tail = packedInstances[idxTail];
        const prev = packedInstances[idxPrev];

        const currentCost = tail.template.cost + prev.template.cost;
        const combinedItems = [...prev.assigned, ...tail.assigned];

        // Try packing without the "Large" template type used in 'prev' to force a different combination
        // (e.g. if we used 1 Large + 1 Small, try 3 Smalls)
        const smallerTemplates = sortedTemplates.filter(t => t.id !== prev.template.id);

        if (smallerTemplates.length > 0) {
          // Re-run packing logic on the combined items with restricted templates
          // Note: The combined items maintain their relative order (Restricted -> Standard) from the previous sort
          const alternativePacking = packItems(combinedItems, smallerTemplates, maxUtilization, getWeightLimit, allowUnitSplitting);

          const totalAltQty = alternativePacking.reduce((sum, i) => sum + i.assigned.reduce((q, p) => q + p.quantity, 0), 0);
          const totalReqQty = combinedItems.reduce((sum, p) => sum + p.quantity, 0);

          // Only accept if all items fit
          if (totalAltQty === totalReqQty) {
            const altCost = alternativePacking.reduce((sum, i) => sum + i.template.cost, 0);

            if (altCost < currentCost) {
              packedInstances.splice(idxPrev, 2);
              packedInstances.push(...alternativePacking);
            }
          }
        }
      }
    }

    // 7. Finalize Output
    packedInstances.forEach(inst => {
      instanceCounter++;
      // Create a unique ID for this specific container instance
      const instanceContainer = {
        ...inst.template,
        id: `${inst.template.id}-instance-${instanceCounter}`,
        // FIX: Ensure the instance has the specific destination of the group 
        // if the template was generic (empty destination)
        destination: inst.template.destination || group.destination
      };

      // Get weight limit for this specific container template
      const weightLimitForTemplate = getWeightLimit(inst.template.id);

      allAssignments.push(validateLoadedContainer(instanceContainer, inst.assigned, weightLimitForTemplate));
    });
  }

  return {
    assignments: allAssignments,
    unassigned: allUnassigned
  };
};