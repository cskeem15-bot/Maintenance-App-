export type AssetType = 'vehicle' | 'property';

export interface VehicleDetails {
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  licensePlate?: string;
  currentMileage: number;
  mileageUpdatedAt: string;
}

export type PropertyKind = 'house' | 'apartment' | 'condo' | 'townhouse' | 'other';

export interface PropertyDetails {
  propertyType: PropertyKind;
  yearBuilt?: number;
  squareFootage?: number;
  hasWaterHeater?: boolean;
  hasHvac?: boolean;
  hasSeptic?: boolean;
  hasGutters?: boolean;
  hasSmokeDetectors?: boolean;
  hasFridgeWaterFilter?: boolean;
  hasSprinklerSystem?: boolean;
  hasDryerVent?: boolean;
  hasFireplace?: boolean;
  hasPestControl?: boolean;
}

export interface Asset {
  id: string;
  householdId: string;
  type: AssetType;
  name: string;
  details: VehicleDetails | PropertyDetails;
  createdAt: string;
  updatedAt: string;
}

export type TaskTriggerType = 'time' | 'mileage' | 'time_or_mileage';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'upcoming' | 'due_soon' | 'overdue';

export interface MaintenanceTask {
  id: string;
  assetId: string;
  title: string;
  category: string;
  triggerType: TaskTriggerType;
  intervalMonths?: number;
  intervalMiles?: number;
  /** Baseline date the interval is measured from (last completion, or seed date if never completed). */
  lastCompletedDate: string;
  /** Baseline mileage the interval is measured from (last completion mileage, or asset mileage at seed time). */
  lastCompletedMileage?: number;
  dueSoonThresholdDays: number;
  dueSoonThresholdMiles: number;
  priority: TaskPriority;
  assignedMemberId?: string;
  notes?: string;
  partNumber?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: string;
  taskId: string;
  assetId: string;
  completedDate: string;
  completedMileage?: number;
  cost?: number;
  vendor?: string;
  notes?: string;
  photoUris?: string[];
  createdAt: string;
}

export type HouseholdRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface HouseholdMembership {
  householdId: string;
  userId: string;
  role: HouseholdRole;
}

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  timezone: string;
  notificationLeadTimeMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
