
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
  country?: string;
  shipToName?: string;
  restrictions: string[]; // e.g., "Temperature Controlled", "Hazmat Class 3"
  readyDate?: string; // YYYY-MM-DD
  shipDeadline?: string; // YYYY-MM-DD
  arrivalDeadline?: string; // YYYY-MM-DD
  shipmentId?: string | null;
  status?: 'available' | 'shipped';
}

export interface Shipment {
  id: string;
  name: string;
  status: 'draft' | 'finalized';
  totalCost: number;
  containerCount: number;
  snapshot: any; // Stores the loaded containers snapshot
  createdAt: string;
}

export interface Container {
  id: string;
  name: string; // Was carrierName + containerType
  capacities: Record<string, number>; // formFactorId -> maxQuantity
  cost: number;
  transitTimeDays: number;
  availableFrom: string;
  destination: string;
  country?: string;
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
  AUTOMATIC = 'Automatic',
  MANUAL = 'Manual'
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface UserProfile {
  id: string;
  email: string;
  company_id: string;
  status: 'active' | 'pending';
  role: 'super_admin' | 'admin' | 'manager' | 'standard';
  can_edit_countries?: boolean;
  can_edit_form_factors?: boolean;
  can_edit_containers?: boolean;
  can_edit_templates?: boolean;
  can_edit_tags?: boolean;
}

export interface CSVMapping {
  // Map internal field name to CSV Header Name (string)
  customerNum: string;
  country: string;
  shipToName: string;
  incoterms: string;
  incoterms2: string;
  salesOrg: string;
  quantity: string;
  description: string;
  tempControl: string;
  // Array of internal field names to combine for the destination key
  groupingFields: string[];
}
