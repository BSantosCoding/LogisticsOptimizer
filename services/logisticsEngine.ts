
import { Product, Container, OptimizationPriority, LoadedContainer } from "../types";

const normalize = (s: string) => s.trim().toLowerCase();

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

export const validateLoadedContainer = (
  container: Container,
  products: Product[]
): LoadedContainer => {

  let totalUtilization = 0;
  const issues: string[] = [];

  // Calculate Utilization
  // Logic: Each product takes up (quantity / max_capacity_for_form_factor) * 100 percent of the container.

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

  if (totalUtilization > 100) {
    issues.push(`Overfilled: ${totalUtilization.toFixed(1)}%`);
  }

  return {
    container,
    assignedProducts: products,
    totalUtilization,
    validationIssues: issues
  };
};

export const calculatePacking = (
  products: Product[],
  containers: Container[],
  priority: OptimizationPriority
): { assignments: LoadedContainer[]; unassigned: Product[] } => {

  // Containers are now templates - we can create multiple instances
  // Track all container instances we create
  const containerInstances: Array<{
    templateId: string;
    instanceId: string;
    template: Container;
    currentUtilization: number;
    assigned: Product[];
  }> = [];

  let instanceCounter = 0;

  // Helper to create a new container instance from a template
  const createContainerInstance = (template: Container) => {
    instanceCounter++;
    return {
      templateId: template.id,
      instanceId: `${template.id}-instance-${instanceCounter}`,
      template: { ...template },
      currentUtilization: 0,
      assigned: [] as Product[]
    };
  };

  // Sort container templates based on priority for selection order
  const sortedContainerTemplates = [...containers].sort((a, b) => {
    if (priority === OptimizationPriority.COST) {
      return a.cost - b.cost;
    } else if (priority === OptimizationPriority.TIME) {
      return a.transitTimeDays - b.transitTimeDays;
    } else if (priority === OptimizationPriority.BALANCE) {
      const scoreA = a.cost + (a.transitTimeDays * 100);
      const scoreB = b.cost + (b.transitTimeDays * 100);
      return scoreA - scoreB;
    } else {
      // UTILIZATION: No specific sorting needed
      return 0;
    }
  });

  // Sort Products by quantity descending (larger items first)
  const sortedProducts = [...products].sort((a, b) => b.quantity - a.quantity);

  // Track remaining quantity for each product
  const remainingQuantities = new Map<string, number>();
  sortedProducts.forEach(p => remainingQuantities.set(p.id, p.quantity));

  for (const product of sortedProducts) {
    let remainingQty = remainingQuantities.get(product.id)!;

    while (remainingQty > 0) {
      let placed = false;

      if (priority === OptimizationPriority.UTILIZATION) {
        // Best-Fit: Find the instance with least remaining space that can fit some/all of this product
        // Prefer containers without unnecessary special capabilities
        let bestInstance = null;
        let bestScore = Infinity;
        let bestFitQty = 0;

        // Check existing instances first
        for (const instance of containerInstances) {
          // Check Compatibility
          const compatibilityIssues = checkCompatibility(product, instance.template);
          if (compatibilityIssues.length > 0) {
            continue;
          }

          // Check Capacity
          const maxCap = instance.template.capacities[product.formFactorId];
          if (!maxCap) continue;

          const remainingSpace = 100 - instance.currentUtilization;
          const maxQtyThatFits = Math.floor((remainingSpace / 100) * maxCap);

          if (maxQtyThatFits > 0) {
            // This instance can fit at least some of the product
            const qtyToPlace = Math.min(maxQtyThatFits, remainingQty);

            const unnecessaryRestrictions = instance.template.restrictions.filter(
              r => !product.restrictions.includes(r)
            ).length;

            // Prefer filling containers more completely
            const utilizationAfter = instance.currentUtilization + ((qtyToPlace / maxCap) * 100);
            const score = (100 - utilizationAfter) + (unnecessaryRestrictions * 1000);

            if (score < bestScore) {
              bestScore = score;
              bestInstance = instance;
              bestFitQty = qtyToPlace;
            }
          }
        }

        // If no existing instance works well, try creating a new instance from templates
        if (!bestInstance || bestFitQty < remainingQty) {
          let bestTemplate = null;
          let bestTemplateScore = Infinity;

          for (const template of sortedContainerTemplates) {
            // Check Compatibility
            const compatibilityIssues = checkCompatibility(product, template);
            if (compatibilityIssues.length > 0) {
              continue;
            }

            // Check Capacity
            const maxCap = template.capacities[product.formFactorId];
            if (!maxCap) continue;

            const unnecessaryRestrictions = template.restrictions.filter(
              r => !product.restrictions.includes(r)
            ).length;

            // For new instances, we can fit up to maxCap or remainingQty, whichever is smaller
            const qtyToPlace = Math.min(maxCap, remainingQty);
            const utilizationAfter = (qtyToPlace / maxCap) * 100;
            const score = (100 - utilizationAfter) + (unnecessaryRestrictions * 1000);

            if (score < bestTemplateScore) {
              bestTemplateScore = score;
              bestTemplate = template;
            }
          }

          // Decide whether to use existing instance or create new one
          if (bestTemplate) {
            const maxCap = bestTemplate.capacities[product.formFactorId]!;
            const newInstanceQty = Math.min(maxCap, remainingQty);

            // Create new instance if it's better than existing or if we need more space
            if (!bestInstance || newInstanceQty > bestFitQty) {
              const newInstance = createContainerInstance(bestTemplate);
              containerInstances.push(newInstance);
              bestInstance = newInstance;
              bestFitQty = newInstanceQty;
            }
          }
        }

        if (bestInstance && bestFitQty > 0) {
          // If this is the first assignment, lock the container's destination to the product's destination
          if (bestInstance.assigned.length === 0 && product.destination) {
            bestInstance.template.destination = product.destination;
          }

          const maxCap = bestInstance.template.capacities[product.formFactorId]!;
          const utilizationNeeded = (bestFitQty / maxCap) * 100;

          // Create a partial product entry
          const partialProduct = { ...product, quantity: bestFitQty };
          bestInstance.assigned.push(partialProduct);
          bestInstance.currentUtilization += utilizationNeeded;

          remainingQty -= bestFitQty;
          placed = true;
        }
      } else {
        // Original greedy strategy for other priorities
        // Try to fit in existing instances first
        for (const instance of containerInstances) {
          const compatibilityIssues = checkCompatibility(product, instance.template);
          if (compatibilityIssues.length > 0) {
            continue;
          }

          const maxCap = instance.template.capacities[product.formFactorId];
          if (!maxCap) continue;

          const remainingSpace = 100 - instance.currentUtilization;
          const maxQtyThatFits = Math.floor((remainingSpace / 100) * maxCap);

          if (maxQtyThatFits > 0) {
            const qtyToPlace = Math.min(maxQtyThatFits, remainingQty);
            const utilizationNeeded = (qtyToPlace / maxCap) * 100;

            // Lock destination if first assignment
            if (instance.assigned.length === 0 && product.destination) {
              instance.template.destination = product.destination;
            }

            const partialProduct = { ...product, quantity: qtyToPlace };
            instance.assigned.push(partialProduct);
            instance.currentUtilization += utilizationNeeded;

            remainingQty -= qtyToPlace;
            placed = true;
            break;
          }
        }

        // If not placed, try creating a new instance
        if (!placed) {
          for (const template of sortedContainerTemplates) {
            const compatibilityIssues = checkCompatibility(product, template);
            if (compatibilityIssues.length > 0) {
              continue;
            }

            const maxCap = template.capacities[product.formFactorId];
            if (!maxCap) continue;

            const qtyToPlace = Math.min(maxCap, remainingQty);
            const utilizationNeeded = (qtyToPlace / maxCap) * 100;

            const newInstance = createContainerInstance(template);

            // Lock destination
            if (product.destination) {
              newInstance.template.destination = product.destination;
            }

            const partialProduct = { ...product, quantity: qtyToPlace };
            newInstance.assigned.push(partialProduct);
            newInstance.currentUtilization += utilizationNeeded;
            containerInstances.push(newInstance);

            remainingQty -= qtyToPlace;
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        // Can't place any more of this product
        break;
      }
    }

    // Update remaining quantity
    remainingQuantities.set(product.id, remainingQty);
  }

  // Collect unassigned products (those with remaining quantity > 0)
  const unassigned: Product[] = [];
  sortedProducts.forEach(product => {
    const remaining = remainingQuantities.get(product.id)!;
    if (remaining > 0) {
      unassigned.push({ ...product, quantity: remaining });
    }
  });

  const activeAssignments = containerInstances.map(instance => {
    // Use the instance ID to make each container unique
    const containerWithInstanceId: Container = {
      ...instance.template,
      id: instance.instanceId
    };

    return validateLoadedContainer(containerWithInstanceId, instance.assigned);
  });

  return {
    assignments: activeAssignments,
    unassigned
  };
};
