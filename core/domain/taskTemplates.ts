import { DEFAULT_DUE_SOON_DAYS, DEFAULT_DUE_SOON_MILES, todayISODate } from './dueDate';
import type { MaintenanceTask, PropertyDetails, TaskPriority, TaskTriggerType } from './types';

/**
 * A starter task definition, prior to being materialized into a full
 * MaintenanceTask (which needs an id, assetId and baseline date/mileage).
 */
export interface TaskTemplate {
  title: string;
  category: string;
  triggerType: TaskTriggerType;
  intervalMonths?: number;
  intervalMiles?: number;
  priority: TaskPriority;
  dueSoonThresholdDays?: number;
  dueSoonThresholdMiles?: number;
  notes?: string;
}

export interface MaterializeContext {
  id: string;
  assetId: string;
  /** Calendar date (YYYY-MM-DD) used as the initial baseline. Defaults to today. */
  seedDate?: string;
  /** The asset's current odometer reading, used as the mileage baseline for mileage-based templates. */
  currentMileage?: number;
  now?: Date;
}

/** Turns a starter template into a full MaintenanceTask, seeded from "now". */
export function materializeTask(template: TaskTemplate, context: MaterializeContext): MaintenanceTask {
  const now = context.now ?? new Date();
  const seedDate = context.seedDate ?? todayISODate(now);
  const nowIso = now.toISOString();

  const needsMileageBaseline = template.triggerType !== 'time' && template.intervalMiles != null;

  return {
    id: context.id,
    assetId: context.assetId,
    title: template.title,
    category: template.category,
    triggerType: template.triggerType,
    intervalMonths: template.intervalMonths,
    intervalMiles: template.intervalMiles,
    lastCompletedDate: seedDate,
    lastCompletedMileage: needsMileageBaseline ? context.currentMileage ?? 0 : undefined,
    dueSoonThresholdDays: template.dueSoonThresholdDays ?? DEFAULT_DUE_SOON_DAYS,
    dueSoonThresholdMiles: template.dueSoonThresholdMiles ?? DEFAULT_DUE_SOON_MILES,
    priority: template.priority,
    notes: template.notes,
    archived: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Default starter maintenance schedule for any newly added vehicle.
 * Intervals are sensible, commonly-cited defaults — every value is editable
 * by the user and nothing here is enforced.
 */
export const VEHICLE_TASK_TEMPLATES: TaskTemplate[] = [
  {
    title: 'Oil & filter change',
    category: 'engine',
    triggerType: 'time_or_mileage',
    intervalMonths: 6,
    intervalMiles: 5000,
    priority: 'high',
  },
  {
    title: 'Tire rotation',
    category: 'tires',
    triggerType: 'time_or_mileage',
    intervalMonths: 6,
    intervalMiles: 6000,
    priority: 'medium',
  },
  {
    title: 'Cabin air filter',
    category: 'filters',
    triggerType: 'time_or_mileage',
    intervalMonths: 12,
    intervalMiles: 12000,
    priority: 'low',
  },
  {
    title: 'Engine air filter',
    category: 'filters',
    triggerType: 'time_or_mileage',
    intervalMonths: 12,
    intervalMiles: 15000,
    priority: 'low',
  },
  {
    title: 'Brake inspection',
    category: 'brakes',
    triggerType: 'time_or_mileage',
    intervalMonths: 12,
    intervalMiles: 12000,
    priority: 'high',
  },
  {
    title: 'Wiper blades',
    category: 'exterior',
    triggerType: 'time',
    intervalMonths: 6,
    priority: 'low',
  },
  {
    title: 'Registration & inspection renewal',
    category: 'compliance',
    triggerType: 'time',
    intervalMonths: 12,
    priority: 'high',
    dueSoonThresholdDays: 30,
  },
  {
    title: 'Coolant service',
    category: 'engine',
    triggerType: 'time_or_mileage',
    intervalMonths: 30,
    intervalMiles: 30000,
    priority: 'medium',
  },
  {
    title: 'Transmission service',
    category: 'drivetrain',
    triggerType: 'time_or_mileage',
    intervalMonths: 36,
    intervalMiles: 30000,
    priority: 'medium',
  },
  {
    title: 'Spark plug replacement',
    category: 'engine',
    triggerType: 'time_or_mileage',
    intervalMonths: 60,
    intervalMiles: 60000,
    priority: 'low',
  },
];

/**
 * Returns the starter maintenance schedule for a newly added vehicle.
 * Currently the same defaults apply regardless of year/make/model; this is
 * the seam where VIN-decoded attributes (e.g. engine type) could later
 * tailor specific intervals.
 */
export function getDefaultVehicleTasks(_vehicle?: {
  year?: number;
  make?: string;
  model?: string;
}): TaskTemplate[] {
  return VEHICLE_TASK_TEMPLATES;
}

/** Questionnaire answers collected when a user adds a home/property. */
export type HomeProfile = Pick<
  PropertyDetails,
  | 'hasWaterHeater'
  | 'hasHvac'
  | 'hasSeptic'
  | 'hasGutters'
  | 'hasSmokeDetectors'
  | 'hasFridgeWaterFilter'
  | 'hasSprinklerSystem'
  | 'hasDryerVent'
  | 'hasFireplace'
  | 'hasPestControl'
>;

interface HomeTaskRule {
  when: (profile: HomeProfile) => boolean;
  template: TaskTemplate;
}

const HOME_TASK_RULES: HomeTaskRule[] = [
  {
    when: (p) => p.hasHvac === true,
    template: {
      title: 'HVAC filter replacement',
      category: 'hvac',
      triggerType: 'time',
      intervalMonths: 3,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasHvac === true,
    template: {
      title: 'HVAC system tune-up',
      category: 'hvac',
      triggerType: 'time',
      intervalMonths: 12,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasWaterHeater === true,
    template: {
      title: 'Water heater flush',
      category: 'plumbing',
      triggerType: 'time',
      intervalMonths: 12,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasSmokeDetectors !== false,
    template: {
      title: 'Smoke & CO detector battery check',
      category: 'safety',
      triggerType: 'time',
      intervalMonths: 6,
      priority: 'high',
    },
  },
  {
    when: (p) => p.hasGutters === true,
    template: {
      title: 'Gutter cleaning',
      category: 'exterior',
      triggerType: 'time',
      intervalMonths: 6,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasDryerVent === true,
    template: {
      title: 'Dryer vent cleaning',
      category: 'appliances',
      triggerType: 'time',
      intervalMonths: 12,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasFridgeWaterFilter === true,
    template: {
      title: 'Refrigerator water filter replacement',
      category: 'appliances',
      triggerType: 'time',
      intervalMonths: 6,
      priority: 'low',
    },
  },
  {
    when: (p) => p.hasSeptic === true,
    template: {
      title: 'Septic tank pumping',
      category: 'plumbing',
      triggerType: 'time',
      intervalMonths: 36,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasSprinklerSystem === true,
    template: {
      title: 'Sprinkler system winterization',
      category: 'exterior',
      triggerType: 'time',
      intervalMonths: 12,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasFireplace === true,
    template: {
      title: 'Chimney & fireplace inspection',
      category: 'safety',
      triggerType: 'time',
      intervalMonths: 12,
      priority: 'medium',
    },
  },
  {
    when: (p) => p.hasPestControl === true,
    template: {
      title: 'Pest control treatment',
      category: 'exterior',
      triggerType: 'time',
      intervalMonths: 3,
      priority: 'low',
    },
  },
];

/**
 * Returns the starter maintenance schedule for a newly added home, based on
 * the systems the user reports having during onboarding. Smoke/CO detectors
 * are included unless the user explicitly says they don't have any.
 */
export function getDefaultHomeTasks(profile: HomeProfile): TaskTemplate[] {
  return HOME_TASK_RULES.filter((rule) => rule.when(profile)).map((rule) => rule.template);
}
