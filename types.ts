
export interface ProductFormFactor {
  id: string;
  name: string;
  description?: string;
  pallet_weight?: number;     // Weight of one pallet in kg
  units_per_pallet?: number;  // How many units of this form factor fit per pallet
}

export interface Product {
  id: string;
  name: string;
  formFactorId: string; // Link to Form Factor
  quantity: number; // Number of units requested
  weight?: number; // Weight per unit in kg
  destination?: string;
  country?: string;
  shipToName?: string;
  restrictions: string[]; // e.g., "Temperature Controlled", "Hazmat Class 3"
  readyDate?: string; // YYYY-MM-DD
  shipDeadline?: string; // YYYY-MM-DD
  arrivalDeadline?: string; // YYYY-MM-DD
  shipmentId?: string | null;
  status?: 'available' | 'shipped';

  // New Fields
  shippingAvailableBy?: string; // ISO Date String
  extraFields?: Record<string, string>; // user-defined key/value pairs
}

export interface Shipment {
  id: string;
  name: string;
  status: 'draft' | 'finalized';
  totalCost: number;
  containerCount: number;
  snapshot: LoadedContainer[]; // Stores the loaded containers snapshot
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
  can_edit_import_config?: boolean;
}

export interface CSVMapping {
  // Core fields - always available, just need header name mapping
  country: string;          // CSV header for country code
  quantity: string;         // CSV header for quantity/number of packages
  weight: string;           // CSV header for weight in kg
  formFactor: string;       // CSV header for form factor name
  restrictions: string[];   // Array of CSV header names for restriction fields
  incoterms: string[];      // Array of CSV header names for incoterms
  shippingAvailableBy: string; // CSV header for date

  // Grouping key - which fields combine to create the destination
  groupingFields: string[]; // Array of field keys (core or custom) to combine for destination
  displayFields?: string[]; // Keys from customFields to show in UI

  // Custom fields - company-specific additional fields
  // Maps internal key name to CSV header name
  customFields: Record<string, string>;
}

export interface OptimizerSettings {
  allowUnitSplitting: boolean;
  shippingDateGroupingRange?: number;
}
