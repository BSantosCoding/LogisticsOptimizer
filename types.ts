
export interface Product {
  id: string;
  name: string;
  weightKg: number;
  volumeM3: number;
  destination?: string; // Added
  restrictions: string[]; // e.g., "Temperature Controlled", "Hazmat Class 3"
  readyDate?: string; // YYYY-MM-DD (Product ready to ship)
  shipDeadline?: string; // YYYY-MM-DD
  arrivalDeadline?: string; // YYYY-MM-DD
}

export interface Deal {
  id: string;
  carrierName: string;
  containerType: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  cost: number;
  transitTimeDays: number;
  availableFrom: string;
  destination: string;
  restrictions: string[]; // Capabilities of the deal e.g. "Flammable", "Frozen"
}

export interface LoadedDeal {
  deal: Deal;
  assignedProducts: Product[];
  totalWeight: number;
  totalVolume: number;
  utilizationWeight: number; // Percentage 0-100
  utilizationVolume: number; // Percentage 0-100
  validationIssues?: string[]; // Warnings if manual packing violates constraints
}

export interface OptimizationResult {
  assignments: LoadedDeal[];
  unassignedProducts: Product[];
  totalCost: number;
  reasoning?: string;
  safetyMarginUsed: number;
}

export enum OptimizationPriority {
  COST = 'Cost',
  TIME = 'Time',
  BALANCE = 'Balance'
}

export interface UserProfile {
  id: string;
  email: string;
  company_id: string;
  status: 'active' | 'pending';
  role: 'admin' | 'manager' | 'standard';
}
