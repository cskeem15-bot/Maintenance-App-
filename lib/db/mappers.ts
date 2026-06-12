import type {
  Asset,
  AssetType,
  Household,
  HouseholdMembership,
  HouseholdRole,
  MaintenanceTask,
  PropertyDetails,
  Profile,
  ServiceRecord,
  TaskPriority,
  TaskTriggerType,
  VehicleDetails,
} from '@/core/domain/types';

export interface AssetRow {
  id: string;
  household_id: string;
  type: AssetType;
  name: string;
  details: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function assetRowToDomain(row: AssetRow): Asset {
  return {
    id: row.id,
    householdId: row.household_id,
    type: row.type,
    name: row.name,
    details: JSON.parse(row.details) as VehicleDetails | PropertyDetails,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function assetDomainToRow(asset: Asset, householdId: string, createdBy: string): AssetRow {
  return {
    id: asset.id,
    household_id: householdId,
    type: asset.type,
    name: asset.name,
    details: JSON.stringify(asset.details),
    created_by: createdBy,
    created_at: asset.createdAt,
    updated_at: asset.updatedAt,
  };
}

export interface MaintenanceTaskRow {
  id: string;
  asset_id: string;
  title: string;
  category: string;
  trigger_type: TaskTriggerType;
  interval_months: number | null;
  interval_miles: number | null;
  last_completed_date: string;
  last_completed_mileage: number | null;
  due_soon_threshold_days: number;
  due_soon_threshold_miles: number;
  priority: TaskPriority;
  assigned_member_id: string | null;
  notes: string | null;
  part_number: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
}

export function taskRowToDomain(row: MaintenanceTaskRow): MaintenanceTask {
  return {
    id: row.id,
    assetId: row.asset_id,
    title: row.title,
    category: row.category,
    triggerType: row.trigger_type,
    intervalMonths: row.interval_months ?? undefined,
    intervalMiles: row.interval_miles ?? undefined,
    lastCompletedDate: row.last_completed_date,
    lastCompletedMileage: row.last_completed_mileage ?? undefined,
    dueSoonThresholdDays: row.due_soon_threshold_days,
    dueSoonThresholdMiles: row.due_soon_threshold_miles,
    priority: row.priority,
    assignedMemberId: row.assigned_member_id ?? undefined,
    notes: row.notes ?? undefined,
    partNumber: row.part_number ?? undefined,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function taskDomainToRow(task: MaintenanceTask): MaintenanceTaskRow {
  return {
    id: task.id,
    asset_id: task.assetId,
    title: task.title,
    category: task.category,
    trigger_type: task.triggerType,
    interval_months: task.intervalMonths ?? null,
    interval_miles: task.intervalMiles ?? null,
    last_completed_date: task.lastCompletedDate,
    last_completed_mileage: task.lastCompletedMileage ?? null,
    due_soon_threshold_days: task.dueSoonThresholdDays,
    due_soon_threshold_miles: task.dueSoonThresholdMiles,
    priority: task.priority,
    assigned_member_id: task.assignedMemberId ?? null,
    notes: task.notes ?? null,
    part_number: task.partNumber ?? null,
    archived: task.archived ? 1 : 0,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export interface ServiceRecordRow {
  id: string;
  task_id: string;
  asset_id: string;
  completed_date: string;
  completed_mileage: number | null;
  cost: number | null;
  vendor: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export function serviceRecordRowToDomain(row: ServiceRecordRow): ServiceRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    assetId: row.asset_id,
    completedDate: row.completed_date,
    completedMileage: row.completed_mileage ?? undefined,
    cost: row.cost ?? undefined,
    vendor: row.vendor ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function serviceRecordDomainToRow(record: ServiceRecord, createdBy: string): ServiceRecordRow {
  return {
    id: record.id,
    task_id: record.taskId,
    asset_id: record.assetId,
    completed_date: record.completedDate,
    completed_mileage: record.completedMileage ?? null,
    cost: record.cost ?? null,
    vendor: record.vendor ?? null,
    notes: record.notes ?? null,
    created_by: createdBy,
    created_at: record.createdAt,
  };
}

export interface HouseholdRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function householdRowToDomain(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function householdDomainToRow(household: Household): HouseholdRow {
  return {
    id: household.id,
    name: household.name,
    created_by: household.createdBy,
    created_at: household.createdAt,
    updated_at: household.updatedAt,
  };
}

export interface HouseholdMemberRow {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
}

export function householdMemberRowToDomain(row: HouseholdMemberRow): HouseholdMembership {
  return {
    householdId: row.household_id,
    userId: row.user_id,
    role: row.role,
  };
}

export function householdMemberDomainToRow(membership: HouseholdMembership, createdAt: string): HouseholdMemberRow {
  return {
    household_id: membership.householdId,
    user_id: membership.userId,
    role: membership.role,
    created_at: createdAt,
  };
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  notification_lead_time_minutes: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export function profileRowToDomain(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    timezone: row.timezone,
    notificationLeadTimeMinutes: row.notification_lead_time_minutes,
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined,
  };
}

export function profileDomainToRow(profile: Profile): ProfileRow {
  return {
    id: profile.id,
    display_name: profile.displayName ?? null,
    avatar_url: profile.avatarUrl ?? null,
    timezone: profile.timezone,
    notification_lead_time_minutes: profile.notificationLeadTimeMinutes,
    quiet_hours_start: profile.quietHoursStart ?? null,
    quiet_hours_end: profile.quietHoursEnd ?? null,
  };
}
