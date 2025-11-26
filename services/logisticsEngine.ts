
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

  if (pDest && cDest && pDest !== cDest) {
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

  // Assuming templates are already sorted (Largest First)
  // The greedy strategy is: Always try to fill the *current open* container.
  // If full, create a new container using the LARGEST available template.

  const packedInstances: Array<{ template: Container; assigned: Product[]; currentUtil: number }> = [];
  const unassigned: Product[] = []; // Should be empty if templates are compatible, but safety check

  // Logic:
  // 1. Loop through products.
  // 2. Try to fit 'qty' into current open container.
  // 3. If it doesn't fit completely, fill current, then open new Largest.

  for (const product of products) {
    let remainingQty = product.quantity;

    // Try to put into existing open container first (Best Fit / First Fit)
    // We only look at the *last* opened container to simulate "filling up" a truck/container.
    // (Searching all previous containers handles "Best Fit", but "Next Fit" is better for sequential packing)
    // Let's stick to filling the last opened container for "Next Fit" behavior which is typical for this problem.

    if (packedInstances.length > 0) {
      const currentInstance = packedInstances[packedInstances.length - 1];
      const maxCap = currentInstance.template.capacities[product.formFactorId];

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

    // If still items left, we need new containers
    while (remainingQty > 0) {
      // Find the largest compatible container for this product
      // We assume 'templates' is sorted Largest -> Smallest
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
  minUtilization: number = 70
): { assignments: LoadedContainer[]; unassigned: Product[] } => {

  // 1. Group Products by Destination AND Restrictions
  // We create a composite key to ensure products with specific needs are grouped together
  // AND products going to different places are separated.
  const productGroups: Record<string, { products: Product[], destination: string, restrictions: string[] }> = {};

  products.forEach(p => {
    const dest = p.destination ? normalize(p.destination) : 'unknown';
    // Sort restrictions to ensure consistent key generation (e.g. "A,B" == "B,A")
    const restrictionsKey = p.restrictions.map(r => normalize(r)).sort().join(',');
    const groupKey = `${dest}::${restrictionsKey}`;

    if (!productGroups[groupKey]) {
      productGroups[groupKey] = {
        products: [],
        destination: p.destination || '',
        restrictions: p.restrictions
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
    // A container is compatible if:
    // a) Destination matches (or is open/empty)
    // b) It has ALL the capabilities required by the group restrictions
    const compatibleTemplates = containers.filter(c => {
      // Destination Check
      if (c.destination && normalize(c.destination) !== normalize(group.destination)) return false;

      // Restrictions/Capabilities Check
      if (group.restrictions.length > 0) {
        const containerCaps = new Set(c.restrictions.map(normalize));
        for (const req of group.restrictions) {
          if (!containerCaps.has(normalize(req))) return false;
        }
      }
      return true;
    });

    if (compatibleTemplates.length === 0) {
      allUnassigned.push(...group.products);
      continue;
    }

    // 3. Sort Templates: Largest Capacity First (Greedy Baseline)
    // Secondary sort: Cheaper first
    const sortedTemplates = [...compatibleTemplates].sort((a, b) => {
      const capA = getContainerCapacityScore(a);
      const capB = getContainerCapacityScore(b);
      if (capA !== capB) return capB - capA;
      return a.cost - b.cost;
    });

    const largestTemplate = sortedTemplates[0];

    // 4. Sort Products: PoC (Percentage of Container) Descending
    // We use the Largest Template available for THIS group as the baseline for "Physical Size"
    const sortedProducts = [...group.products].sort((a, b) => {
      // PoC (Physical Size relative to largest container)
      const pocA = getPoC(a, largestTemplate);
      const pocB = getPoC(b, largestTemplate);
      if (pocA !== pocB) return pocB - pocA; // Descending (Larger first)

      // Quantity (Largest batches first)
      return b.quantity - a.quantity;
    });

    // 5. Phase 1: Greedy Packing
    let packedInstances = packItems(sortedProducts, sortedTemplates);

    // 6. Phase 2: Optimization Loop
    // We iterate backwards to optimize the "tail" of the packing list
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

      // Step B: Optimize Last Full + Remainder (Backtrack check)
      // If we have at least 2 containers, check if [Last-1] + [Last] can be repacked 
      // into smaller containers cheaper than Cost(Last-1) + Cost(Last).
      if (packedInstances.length >= 2) {
        const idxTail = packedInstances.length - 1;
        const idxPrev = packedInstances.length - 2;

        const tail = packedInstances[idxTail];
        const prev = packedInstances[idxPrev];

        const currentCost = tail.template.cost + prev.template.cost;
        const combinedItems = [...prev.assigned, ...tail.assigned];

        // To force a different outcome, we try packing these items 
        // excluding the "Large" template type used in 'prev'.
        // (Assumes 'prev' used the largest template, which is typical for greedy)
        const smallerTemplates = sortedTemplates.filter(t => t.id !== prev.template.id);

        if (smallerTemplates.length > 0) {
          // Simulate packing with smaller containers
          const alternativePacking = packItems(combinedItems, smallerTemplates);

          // Check if valid (all packed) and cheaper
          // Note: packItems might return partials if it can't fit everything, 
          // but here we must ensure everything fits to be a valid replacement.
          const totalAltQty = alternativePacking.reduce((sum, i) => sum + i.assigned.reduce((q, p) => q + p.quantity, 0), 0);
          const totalReqQty = combinedItems.reduce((sum, p) => sum + p.quantity, 0);

          if (totalAltQty === totalReqQty) {
            const altCost = alternativePacking.reduce((sum, i) => sum + i.template.cost, 0);

            if (altCost < currentCost) {
              // Apply Optimization: Replace the last 2 containers with the new set
              // Remove last 2
              packedInstances.splice(idxPrev, 2);
              // Add new ones
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
        id: `${inst.template.id}-instance-${instanceCounter}`
      };

      allAssignments.push(validateLoadedContainer(instanceContainer, inst.assigned));
    });
  }

  return {
    assignments: allAssignments,
    unassigned: allUnassigned
  };
};
