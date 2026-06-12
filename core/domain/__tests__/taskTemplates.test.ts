import { getNextDueDate, getNextDueMileage } from '../dueDate';
import {
  getDefaultHomeTasks,
  getDefaultVehicleTasks,
  materializeTask,
  type HomeProfile,
} from '../taskTemplates';

describe('getDefaultVehicleTasks', () => {
  it('returns a non-empty starter schedule covering the required categories', () => {
    const templates = getDefaultVehicleTasks({ year: 2022, make: 'Toyota', model: 'Camry' });
    const titles = templates.map((t) => t.title);

    expect(titles).toEqual(
      expect.arrayContaining([
        'Oil & filter change',
        'Tire rotation',
        'Cabin air filter',
        'Engine air filter',
        'Brake inspection',
        'Wiper blades',
        'Registration & inspection renewal',
        'Coolant service',
        'Transmission service',
        'Spark plug replacement',
      ])
    );
  });

  it('gives every template a valid trigger type and positive intervals', () => {
    for (const template of getDefaultVehicleTasks()) {
      expect(['time', 'mileage', 'time_or_mileage']).toContain(template.triggerType);
      if (template.triggerType !== 'mileage') {
        expect(template.intervalMonths).toBeGreaterThan(0);
      }
      if (template.triggerType !== 'time') {
        expect(template.intervalMiles).toBeGreaterThan(0);
      }
    }
  });
});

describe('getDefaultHomeTasks', () => {
  const fullProfile: HomeProfile = {
    hasWaterHeater: true,
    hasHvac: true,
    hasSeptic: true,
    hasGutters: true,
    hasSmokeDetectors: true,
    hasFridgeWaterFilter: true,
    hasSprinklerSystem: true,
    hasDryerVent: true,
    hasFireplace: true,
    hasPestControl: true,
  };

  it('seeds a task for every system the household reports having', () => {
    const titles = getDefaultHomeTasks(fullProfile).map((t) => t.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        'HVAC filter replacement',
        'HVAC system tune-up',
        'Water heater flush',
        'Smoke & CO detector battery check',
        'Gutter cleaning',
        'Dryer vent cleaning',
        'Refrigerator water filter replacement',
        'Septic tank pumping',
        'Sprinkler system winterization',
        'Chimney & fireplace inspection',
        'Pest control treatment',
      ])
    );
  });

  it('omits tasks for systems the household does not have', () => {
    const profile: HomeProfile = {
      hasWaterHeater: false,
      hasHvac: false,
      hasSeptic: false,
      hasGutters: false,
      hasSmokeDetectors: true,
      hasFridgeWaterFilter: false,
      hasSprinklerSystem: false,
      hasDryerVent: false,
      hasFireplace: false,
      hasPestControl: false,
    };
    const titles = getDefaultHomeTasks(profile).map((t) => t.title);
    expect(titles).toEqual(['Smoke & CO detector battery check']);
  });

  it('includes smoke detector checks by default when the question is left unanswered', () => {
    const profile: HomeProfile = {};
    const titles = getDefaultHomeTasks(profile).map((t) => t.title);
    expect(titles).toContain('Smoke & CO detector battery check');
  });

  it('excludes smoke detector checks only when the user explicitly says they have none', () => {
    const profile: HomeProfile = { hasSmokeDetectors: false };
    const titles = getDefaultHomeTasks(profile).map((t) => t.title);
    expect(titles).not.toContain('Smoke & CO detector battery check');
  });
});

describe('materializeTask', () => {
  it('seeds a time-based task with today as the baseline date and no mileage baseline', () => {
    const template = getDefaultVehicleTasks().find((t) => t.title === 'Wiper blades')!;
    const now = new Date(2026, 5, 12);

    const task = materializeTask(template, { id: 'task-1', assetId: 'asset-1', now });

    expect(task.lastCompletedDate).toBe('2026-06-12');
    expect(task.lastCompletedMileage).toBeUndefined();
    expect(getNextDueDate(task)).toBe('2026-12-12');
  });

  it('seeds a mileage-based task baseline from the asset current mileage', () => {
    const template = getDefaultVehicleTasks().find((t) => t.title === 'Oil & filter change')!;
    const now = new Date(2026, 5, 12);

    const task = materializeTask(template, {
      id: 'task-1',
      assetId: 'asset-1',
      now,
      currentMileage: 42000,
    });

    expect(task.lastCompletedMileage).toBe(42000);
    expect(getNextDueMileage(task)).toBe(47000);
    expect(getNextDueDate(task)).toBe('2026-12-12');
  });

  it('defaults the mileage baseline to 0 if the asset has no recorded mileage', () => {
    const template = getDefaultVehicleTasks().find((t) => t.title === 'Oil & filter change')!;
    const task = materializeTask(template, { id: 'task-1', assetId: 'asset-1', now: new Date(2026, 5, 12) });
    expect(task.lastCompletedMileage).toBe(0);
  });

  it('falls back to engine-level default due-soon thresholds when not specified', () => {
    const template = getDefaultVehicleTasks().find((t) => t.title === 'Tire rotation')!;
    const task = materializeTask(template, { id: 'task-1', assetId: 'asset-1', now: new Date(2026, 5, 12) });
    expect(task.dueSoonThresholdDays).toBe(14);
    expect(task.dueSoonThresholdMiles).toBe(500);
  });

  it('honors a custom due-soon threshold from the template (registration renewal)', () => {
    const template = getDefaultVehicleTasks().find((t) => t.title === 'Registration & inspection renewal')!;
    const task = materializeTask(template, { id: 'task-1', assetId: 'asset-1', now: new Date(2026, 5, 12) });
    expect(task.dueSoonThresholdDays).toBe(30);
  });
});
