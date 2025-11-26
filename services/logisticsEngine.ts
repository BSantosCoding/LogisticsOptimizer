
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

export const calculatePacking = (
  products: Product[],
  containers: Container[],
  priority: OptimizationPriority,
  minUtilization: number = 70
): { assignments: LoadedContainer[]; unassigned: Product[] } => {

  const MIN_UTILIZATION_THRESHOLD = minUtilization;

  // Group products by destination
  const productsByDestination = products.reduce((acc, product) => {
    const dest = product.destination || 'Unknown';
    if (!acc[dest]) acc[dest] = [];
    acc[dest].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Sort container templates by capacity descending
  const getCapacityScore = (c: Container) => Object.values(c.capacities).reduce((sum, val) => sum + val, 0);
  const sortedContainerTemplates = [...containers].sort((a, b) => getCapacityScore(b) - getCapacityScore(a));

  let instanceCounter = 0;
  const allContainerInstances: LoadedContainer[] = [];
  const allUnassigned: Product[] = [];

  const createContainerInstance = (template: Container, destination: string) => {
    instanceCounter++;
    return {
      templateId: template.id,
      instanceId: `${template.id}-instance-${instanceCounter}`,
      template: { ...template, destination, id: `${template.id}-instance-${instanceCounter}` },
      currentUtilization: 0,
      assigned: [] as Product[]
    };
  };

  // Process each destination group independently
  for (const [destination, destProducts] of Object.entries(productsByDestination)) {
    const sortedProducts = [...destProducts].sort((a, b) => b.quantity - a.quantity);

    const containerInstances: Array<{
      templateId: string;
      instanceId: string;
      template: Container;
      currentUtilization: number;
      assigned: Product[];
    }> = [];

    // PHASE 1: Pack products into largest containers first
    for (const product of sortedProducts) {
      let remainingQty = product.quantity;

      while (remainingQty > 0) {
        // Try existing containers first (Best Fit)
        let bestInstance = null;
        let bestScore = Infinity;
        let bestFitQty = 0;

        for (const instance of containerInstances) {
          const compatibilityIssues = checkCompatibility(product, instance.template);
          if (compatibilityIssues.length > 0) continue;

          const maxCap = instance.template.capacities[product.formFactorId];
          if (!maxCap) continue;

          const remainingSpace = 100 - instance.currentUtilization;
          const maxQtyThatFits = Math.floor((remainingSpace / 100) * maxCap);

          if (maxQtyThatFits > 0) {
            const qtyToPlace = Math.min(maxQtyThatFits, remainingQty);
            const utilizationAfter = instance.currentUtilization + ((qtyToPlace / maxCap) * 100);
            const score = (100 - utilizationAfter);

            if (score < bestScore) {
              bestScore = score;
              bestInstance = instance;
              bestFitQty = qtyToPlace;
            }
          }
        }

        // If no existing container works, create new one
        // ALWAYS prefer largest containers first to minimize total container count
        if (!bestInstance) {
          for (const template of sortedContainerTemplates) {
            const compatibilityIssues = checkCompatibility(product, template);
            if (compatibilityIssues.length > 0) continue;

            const maxCap = template.capacities[product.formFactorId];
            if (!maxCap) continue;

            const qtyThatFits = Math.min(maxCap, remainingQty);

            // Always use the first (largest) compatible container
            const newInstance = createContainerInstance(template, destination);
            containerInstances.push(newInstance);
            bestInstance = newInstance;
            bestFitQty = qtyThatFits;
            break;
          }
        }

        // Apply assignment
        if (bestInstance && bestFitQty > 0) {
          const maxCap = bestInstance.template.capacities[product.formFactorId]!;
          const utilizationNeeded = (bestFitQty / maxCap) * 100;

          bestInstance.assigned.push({ ...product, quantity: bestFitQty });
          bestInstance.currentUtilization += utilizationNeeded;
          remainingQty -= bestFitQty;
        } else {
          break;
        }
      }

      if (remainingQty > 0) {
        allUnassigned.push({ ...product, quantity: remainingQty });
      }
    }

    // Convert to LoadedContainer
    containerInstances.forEach(instance => {
      const validated = validateLoadedContainer(instance.template, instance.assigned);
      allContainerInstances.push(validated);
    });
  }

  return {
    assignments: allContainerInstances,
    unassigned: allUnassigned
  };
};
