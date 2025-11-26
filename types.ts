
export interface ProductFormFactor {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  formFactorId: string; // Link to Form Factor
  quantity: number; // Number of units requested
  destination?: string;
  restrictions: string[]; // e.g., "Temperature Controlled", "Hazmat Class 3"
  readyDate?: string; // YYYY-MM-DD
  shipDeadline?: string; // YYYY-MM-DD
  arrivalDeadline?: string; // YYYY-MM-DD
}

export interface Container {
  id: string;
  name: string; // Was carrierName + containerType
  capacities: Record<string, number>; // formFactorId -> maxQuantity
  cost: number;
  transitTimeDays: number;
  availableFrom: string;
  destination: string;
  restrictions: string[]; // Capabilities e.g. "Flammable", "Frozen"
}

export interface LoadedContainer {
  container: Container;
  assignedProducts: Product[];
  totalUtilization: number; // Percentage 0-100 (based on form factor mix)
  validationIssues?: string[];
}

export interface OptimizationResult {
  assignments: LoadedContainer[];
  unassignedProducts: Product[];
  totalCost: number;
  reasoning?: string;
}

export enum OptimizationPriority {
  COST = 'Cost',
  TIME = 'Time',
  BALANCE = 'Balance',
  UTILIZATION = 'Utilization'
}

export interface UserProfile {
  id: string;
  email: string;
  company_id: string;
  status: 'active' | 'pending';
  role: 'admin' | 'manager' | 'standard';
}
