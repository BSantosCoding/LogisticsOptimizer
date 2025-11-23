
import { Product, Deal, OptimizationPriority, LoadedDeal } from "../types";

const normalize = (s: string) => s.trim().toLowerCase();

export const checkCompatibility = (product: Product, deal: Deal): string[] => {
  const issues: string[] = [];

  // 1. Check Restrictions
  if (product.restrictions.length > 0) {
    const dealCaps = new Set(deal.restrictions.map(normalize));
    const missingCaps = product.restrictions.filter(req => !dealCaps.has(normalize(req)));
    if (missingCaps.length > 0) {
      issues.push(`Missing capabilities: ${missingCaps.join(', ')}`);
    }
  }

  // 2. Check Dates
  const dealAvailTime = new Date(deal.availableFrom).getTime();
  const dealArriveTime = dealAvailTime + (deal.transitTimeDays * 24 * 60 * 60 * 1000);

  // Check if product is ready before deal departs
  if (product.readyDate) {
    const readyTime = new Date(product.readyDate).getTime();
    if (dealAvailTime < readyTime) {
      issues.push(`Deal departs (${deal.availableFrom}) before product is ready (${product.readyDate})`);
    }
  }

  if (product.shipDeadline) {
    const shipDead = new Date(product.shipDeadline).getTime();
    if (dealAvailTime > shipDead) {
      issues.push(`Ships after deadline (${product.shipDeadline})`);
    }
  }

  if (product.arrivalDeadline) {
    const arriveDead = new Date(product.arrivalDeadline).getTime();
    if (dealArriveTime > arriveDead) {
      issues.push(`Arrives after deadline (${product.arrivalDeadline})`);
    }
  }

  return issues;
};

export const validateLoadedDeal = (
  deal: Deal, 
  products: Product[], 
  marginPercentage: number,
  ignoreWeight: boolean = false,
  ignoreVolume: boolean = false
): LoadedDeal => {
  const effectiveMaxWeight = deal.maxWeightKg * (1 - marginPercentage / 100);
  const effectiveMaxVolume = deal.maxVolumeM3 * (1 - marginPercentage / 100);
  
  let currentWeight = 0;
  let currentVolume = 0;
  const issues: string[] = [];

  // Check individual product compatibility
  products.forEach(p => {
    const productIssues = checkCompatibility(p, deal);
    if (productIssues.length > 0) {
      issues.push(`${p.name}: ${productIssues.join(', ')}`);
    }
    currentWeight += p.weightKg;
    currentVolume += p.volumeM3;
  });

  // Check Capacity
  if (!ignoreWeight && currentWeight > effectiveMaxWeight) {
    issues.push(`Overweight by ${(currentWeight - effectiveMaxWeight).toFixed(1)}kg (incl. safety margin)`);
  }
  if (!ignoreVolume && currentVolume > effectiveMaxVolume) {
    issues.push(`Over volume by ${(currentVolume - effectiveMaxVolume).toFixed(2)}m³ (incl. safety margin)`);
  }

  // Check Hard Capacity (ignoring margin, just for sanity, unless explicitly ignored)
  if (!ignoreWeight && currentWeight > deal.maxWeightKg) {
     issues.push(`EXCEEDS PHYSICAL WEIGHT LIMIT by ${(currentWeight - deal.maxWeightKg).toFixed(1)}kg`);
  }

  return {
    deal,
    assignedProducts: products,
    totalWeight: currentWeight,
    totalVolume: currentVolume,
    utilizationWeight: (currentWeight / effectiveMaxWeight) * 100,
    utilizationVolume: (currentVolume / effectiveMaxVolume) * 100,
    validationIssues: issues
  };
};

export const calculatePacking = (
  products: Product[],
  deals: Deal[],
  marginPercentage: number,
  priority: OptimizationPriority,
  ignoreWeight: boolean = false,
  ignoreVolume: boolean = false
): { assignments: LoadedDeal[]; unassigned: Product[] } => {
  
  const availableDeals = deals.map(deal => ({
    ...deal,
    effectiveMaxWeight: deal.maxWeightKg * (1 - marginPercentage / 100),
    effectiveMaxVolume: deal.maxVolumeM3 * (1 - marginPercentage / 100),
    currentWeight: 0,
    currentVolume: 0,
    assigned: [] as Product[]
  }));

  // Sort Deals
  availableDeals.sort((a, b) => {
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

  const sortedProducts = [...products].sort((a, b) => b.volumeM3 - a.volumeM3);
  const unassigned: Product[] = [];

  for (const product of sortedProducts) {
    let placed = false;

    for (const deal of availableDeals) {
      // Check Hard Constraints
      const compatibilityIssues = checkCompatibility(product, deal);
      if (compatibilityIssues.length > 0) {
        continue;
      }

      // Check Capacity
      const fitsWeight = ignoreWeight || (deal.currentWeight + product.weightKg <= deal.effectiveMaxWeight);
      const fitsVolume = ignoreVolume || (deal.currentVolume + product.volumeM3 <= deal.effectiveMaxVolume);

      if (fitsWeight && fitsVolume) {
        deal.assigned.push(product);
        deal.currentWeight += product.weightKg;
        deal.currentVolume += product.volumeM3;
        placed = true;
        break;
      }
    }

    if (!placed) {
      unassigned.push(product);
    }
  }

  const activeAssignments = availableDeals
    .filter(d => d.assigned.length > 0)
    .map(d => {
      // Re-construct original deal object
      const originalDeal: Deal = {
        id: d.id,
        carrierName: d.carrierName,
        containerType: d.containerType,
        maxWeightKg: d.maxWeightKg,
        maxVolumeM3: d.maxVolumeM3,
        cost: d.cost,
        transitTimeDays: d.transitTimeDays,
        availableFrom: d.availableFrom,
        destination: d.destination,
        restrictions: d.restrictions
      };
      
      // Return validated deal
      return validateLoadedDeal(originalDeal, d.assigned, marginPercentage, ignoreWeight, ignoreVolume);
    });

  return {
    assignments: activeAssignments,
    unassigned
  };
};