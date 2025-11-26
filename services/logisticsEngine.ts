
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

  // Prepare containers with tracking state
  const availableContainers = containers.map(c => ({
    ...c,
    currentUtilization: 0,
    assigned: [] as Product[]
  }));

  // Sort Containers
  availableContainers.sort((a, b) => {
    if (priority === OptimizationPriority.COST) {
      return a.cost - b.cost;
    } else if (priority === OptimizationPriority.TIME) {
      return a.transitTimeDays - b.transitTimeDays;
    } else {
      const scoreA = a.cost + (a.transitTimeDays * 100);
      const scoreB = b.cost + (b.transitTimeDays * 100);
      return scoreA - scoreB;
    }
  });

  // Sort Products (maybe by quantity desc? or arbitrary)
  const sortedProducts = [...products].sort((a, b) => b.quantity - a.quantity);
  const unassigned: Product[] = [];

  for (const product of sortedProducts) {
    let placed = false;

    for (const container of availableContainers) {
      // Check Compatibility
      const compatibilityIssues = checkCompatibility(product, container);
      if (compatibilityIssues.length > 0) {
        continue;
      }

      // Check Capacity
      const maxCap = container.capacities[product.formFactorId];
      if (!maxCap) continue; // Should be caught by compatibility, but double check

      const utilizationNeeded = (product.quantity / maxCap) * 100;

      if (container.currentUtilization + utilizationNeeded <= 100) {
        container.assigned.push(product);
        container.currentUtilization += utilizationNeeded;
        placed = true;
        break;
      }
    }

    if (!placed) {
      unassigned.push(product);
    }
  }

  const activeAssignments = availableContainers
    .filter(c => c.assigned.length > 0)
    .map(c => {
      // Re-construct original container object
      const originalContainer: Container = {
        id: c.id,
        name: c.name,
        capacities: c.capacities,
        cost: c.cost,
        transitTimeDays: c.transitTimeDays,
        availableFrom: c.availableFrom,
        destination: c.destination,
        restrictions: c.restrictions
      };

      // Return validated container
      return validateLoadedContainer(originalContainer, c.assigned);
    });

  return {
    assignments: activeAssignments,
    unassigned
  };
};
