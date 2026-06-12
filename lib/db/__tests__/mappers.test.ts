import {
  assetDomainToRow,
  assetRowToDomain,
  householdDomainToRow,
  householdRowToDomain,
  profileDomainToRow,
  profileRowToDomain,
  serviceRecordDomainToRow,
  serviceRecordRowToDomain,
  taskDomainToRow,
  taskRowToDomain,
  type AssetRow,
  type HouseholdRow,
  type MaintenanceTaskRow,
  type ProfileRow,
  type ServiceRecordRow,
} from '../mappers';
import type { Asset, Household, MaintenanceTask, Profile, ServiceRecord, VehicleDetails } from '@/core/domain/types';

describe('asset mappers', () => {
  const details: VehicleDetails = {
    year: 2018,
    make: 'Honda',
    model: 'Civic',
    currentMileage: 45000,
    mileageUpdatedAt: '2026-06-01',
  };

  const domain: Asset = {
    id: 'asset-1',
    householdId: 'household-1',
    type: 'vehicle',
    name: '2018 Honda Civic',
    details,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  it('round-trips through row representation', () => {
    const row = assetDomainToRow(domain, 'household-1', 'user-1');
    expect(row).toEqual<AssetRow>({
      id: 'asset-1',
      household_id: 'household-1',
      type: 'vehicle',
      name: '2018 Honda Civic',
      details: JSON.stringify(details),
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    expect(assetRowToDomain(row)).toEqual(domain);
  });
});

describe('maintenance task mappers', () => {
  const domain: MaintenanceTask = {
    id: 'task-1',
    assetId: 'asset-1',
    title: 'Oil & filter change',
    category: 'engine',
    triggerType: 'time_or_mileage',
    intervalMonths: 6,
    intervalMiles: 5000,
    lastCompletedDate: '2026-01-01',
    lastCompletedMileage: 40000,
    dueSoonThresholdDays: 14,
    dueSoonThresholdMiles: 500,
    priority: 'high',
    assignedMemberId: undefined,
    notes: undefined,
    partNumber: undefined,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('round-trips through row representation', () => {
    const row = taskDomainToRow(domain);
    expect(row).toEqual<MaintenanceTaskRow>({
      id: 'task-1',
      asset_id: 'asset-1',
      title: 'Oil & filter change',
      category: 'engine',
      trigger_type: 'time_or_mileage',
      interval_months: 6,
      interval_miles: 5000,
      last_completed_date: '2026-01-01',
      last_completed_mileage: 40000,
      due_soon_threshold_days: 14,
      due_soon_threshold_miles: 500,
      priority: 'high',
      assigned_member_id: null,
      notes: null,
      part_number: null,
      archived: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    expect(taskRowToDomain(row)).toEqual(domain);
  });

  it('round-trips archived tasks and optional fields', () => {
    const archivedTask: MaintenanceTask = {
      ...domain,
      assignedMemberId: 'user-2',
      notes: 'Use synthetic oil',
      partNumber: 'ABC-123',
      archived: true,
    };

    const row = taskDomainToRow(archivedTask);
    expect(row.archived).toBe(1);
    expect(row.assigned_member_id).toBe('user-2');
    expect(taskRowToDomain(row)).toEqual(archivedTask);
  });
});

describe('service record mappers', () => {
  const domain: ServiceRecord = {
    id: 'record-1',
    taskId: 'task-1',
    assetId: 'asset-1',
    completedDate: '2026-06-10',
    completedMileage: 45000,
    cost: 64.99,
    vendor: 'Quick Lube',
    notes: undefined,
    createdAt: '2026-06-10T12:00:00.000Z',
  };

  it('round-trips through row representation', () => {
    const row = serviceRecordDomainToRow(domain, 'user-1');
    expect(row).toEqual<ServiceRecordRow>({
      id: 'record-1',
      task_id: 'task-1',
      asset_id: 'asset-1',
      completed_date: '2026-06-10',
      completed_mileage: 45000,
      cost: 64.99,
      vendor: 'Quick Lube',
      notes: null,
      created_by: 'user-1',
      created_at: '2026-06-10T12:00:00.000Z',
    });

    expect(serviceRecordRowToDomain(row)).toEqual(domain);
  });
});

describe('household mappers', () => {
  const domain: Household = {
    id: 'household-1',
    name: 'My Household',
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('round-trips through row representation', () => {
    const row = householdDomainToRow(domain);
    expect(row).toEqual<HouseholdRow>({
      id: 'household-1',
      name: 'My Household',
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    expect(householdRowToDomain(row)).toEqual(domain);
  });
});

describe('profile mappers', () => {
  const domain: Profile = {
    id: 'user-1',
    displayName: 'Demo User',
    avatarUrl: undefined,
    timezone: 'America/Chicago',
    notificationLeadTimeMinutes: 1440,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };

  it('round-trips through row representation', () => {
    const row = profileDomainToRow(domain);
    expect(row).toEqual<ProfileRow>({
      id: 'user-1',
      display_name: 'Demo User',
      avatar_url: null,
      timezone: 'America/Chicago',
      notification_lead_time_minutes: 1440,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
    });

    expect(profileRowToDomain(row)).toEqual(domain);
  });

  it('handles missing optional fields', () => {
    const minimal: Profile = {
      id: 'user-2',
      timezone: 'UTC',
      notificationLeadTimeMinutes: 1440,
    };

    const row = profileDomainToRow(minimal);
    expect(row.display_name).toBeNull();
    expect(profileRowToDomain(row)).toEqual(minimal);
  });
});
