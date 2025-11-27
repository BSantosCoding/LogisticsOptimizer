import { Product, Container, OptimizationPriority, LoadedContainer } from "../types";

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

export const checkCompatibility = (product: Product, container: Container): string[] => {
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

  // 4. Check Dates
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
  products: Product[]
): LoadedContainer => {

  let totalUtilization = 0;
  const issues: string[] = [];

  // Calculate Utilization
  products.forEach(p => {
    const maxCap = container.capacities[p.formFactorId];
    if (!maxCap) {
      issues.push(`${p.name}: Container does not support form factor ${p.formFactorId}`);
    } else {
      const utilizationContribution = (p.quantity / maxCap) * 100;
      totalUtilization += utilizationContribution;
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

  return {
    container,
    assignedProducts: products,
    totalUtilization,
    validationIssues: issues
  };
};

// Helper to check if a list of products fits in a container template
const canFit = (products: Product[], container: Container): boolean => {
  let totalUtilization = 0;
  for (const p of products) {
    const maxCap = container.capacities[p.formFactorId];
    if (!maxCap) return false;

    const issues = checkCompatibility(p, container);
    if (issues.length > 0) return false;

    totalUtilization += (p.quantity / maxCap) * 100;
  }
  return totalUtilization <= 100.1;
};

// --- Core Packing Logic (Greedy) ---
// Returns a list of raw container instances (unvalidated)
const packItems = (
  products: Product[],
  templates: Container[]
): Array<{ template: Container; assigned: Product[] }> => {

  if (templates.length === 0) return [];

  // templates are assumed to be sorted by Preference (usually Capacity Desc, Cost Asc)

  const packedInstances: Array<{ template: Container; assigned: Product[]; currentUtil: number }> = [];
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
        const spacePercent = 100.1 - currentInstance.currentUtil;
        const maxQtyThatFits = Math.floor((spacePercent / 100) * maxCap);

        if (maxQtyThatFits > 0) {
          const take = Math.min(maxQtyThatFits, remainingQty);
          currentInstance.assigned.push({ ...product, quantity: take });
          currentInstance.currentUtil += (take / maxCap) * 100;
          remainingQty -= take;
        }
      }
    }

    // Phase B: If still items left, open new containers
    while (remainingQty > 0) {
      // Find the best template for THIS product
      // Since products are sorted by Restricted -> Standard, this ensures that if the current
      // product is Restricted, we pick a container that supports it (e.g. Reefer).
      const bestTemplate = templates.find(t =>
        t.capacities[product.formFactorId] &&
        checkCompatibility(product, t).length === 0
      );

      if (!bestTemplate) {
        // Cannot fit anywhere
        unassigned.push({ ...product, quantity: remainingQty });
        break;
      }

      const maxCap = bestTemplate.capacities[product.formFactorId];
      const take = Math.min(maxCap, remainingQty); // Can't take more than a full container obviously

      // Create new instance
      packedInstances.push({
        template: bestTemplate,
        assigned: [{ ...product, quantity: take }],
        currentUtil: (take / maxCap) * 100
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
  countryCosts: Record<string, Record<string, number>> = {} // countryCode -> containerTemplateId -> cost
): { assignments: LoadedContainer[]; unassigned: Product[] } => {

  // 1. Group Products by Destination ONLY
  const productGroups: Record<string, { products: Product[], destination: string }> = {};

  products.forEach(p => {
    const destRaw = p.destination || '';
    const destNorm = normalize(destRaw);
    // Use normalized key for grouping, but handle 'empty' as a valid group
    const groupKey = destNorm || 'unknown';

    if (!productGroups[groupKey]) {
      productGroups[groupKey] = {
        products: [],
        destination: destRaw
      };
    }
    productGroups[groupKey].products.push(p);
  });

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

    // 5. Phase 1: Greedy Packing
    let packedInstances = packItems(sortedProducts, sortedTemplates);

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
        if (t.cost < bestCost && canFit(lastInstance.assigned, t)) {
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
          const alternativePacking = packItems(combinedItems, smallerTemplates);

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

      allAssignments.push(validateLoadedContainer(instanceContainer, inst.assigned));
    });
  }

  return {
    assignments: allAssignments,
    unassigned: allUnassigned
  };
};