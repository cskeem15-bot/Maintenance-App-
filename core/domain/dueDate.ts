import type { MaintenanceTask, TaskStatus } from './types';

export const DEFAULT_DUE_SOON_DAYS = 14;
export const DEFAULT_DUE_SOON_MILES = 500;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * All date math below operates on calendar dates ("YYYY-MM-DD") using UTC
 * internally purely as a fixed-offset arithmetic space — this keeps interval
 * math (month rollovers, day differences) independent of the host's local
 * timezone so the same inputs always produce the same due dates.
 */
function toUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns the local calendar date (YYYY-MM-DD) for the given instant. */
export function todayISODate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Adds `months` to a calendar date, clamping the day to the target month's length. */
export function addMonths(dateStr: string, months: number): string {
  const d = toUTCDate(dateStr);
  const day = d.getUTCDate();
  const targetMonthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const targetYear = targetMonthStart.getUTCFullYear();
  const targetMonth = targetMonthStart.getUTCMonth();
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);
  return toDateString(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
}

/** Returns `to - from` in whole days (positive when `to` is later). */
export function diffInDays(from: string, to: string): number {
  return Math.round((toUTCDate(to).getTime() - toUTCDate(from).getTime()) / MS_PER_DAY);
}

export interface TaskDueInfo {
  nextDueDate?: string;
  nextDueMileage?: number;
  /** Days from today until `nextDueDate`. Negative means overdue. */
  daysUntilDue?: number;
  /** Miles remaining until `nextDueMileage`. Negative means overdue. */
  milesUntilDue?: number;
  status: TaskStatus;
  /** Which dimension (time or mileage) is driving `status`. */
  dueReason: 'time' | 'mileage' | null;
}

export interface DueContext {
  now?: Date;
  /** The asset's current odometer reading, required to evaluate mileage-based tasks. */
  currentMileage?: number;
}

type DueDateInputTask = Pick<MaintenanceTask, 'triggerType' | 'intervalMonths' | 'lastCompletedDate'>;
type DueMileageInputTask = Pick<MaintenanceTask, 'triggerType' | 'intervalMiles' | 'lastCompletedMileage'>;
type DueInfoInputTask = DueDateInputTask &
  DueMileageInputTask &
  Pick<MaintenanceTask, 'dueSoonThresholdDays' | 'dueSoonThresholdMiles'>;

export function getNextDueDate(task: DueDateInputTask): string | undefined {
  if (task.triggerType === 'mileage') return undefined;
  if (task.intervalMonths == null) return undefined;
  return addMonths(task.lastCompletedDate, task.intervalMonths);
}

export function getNextDueMileage(task: DueMileageInputTask): number | undefined {
  if (task.triggerType === 'time') return undefined;
  if (task.intervalMiles == null || task.lastCompletedMileage == null) return undefined;
  return task.lastCompletedMileage + task.intervalMiles;
}

function statusFromDays(days: number, threshold: number): TaskStatus {
  if (days < 0) return 'overdue';
  if (days <= threshold) return 'due_soon';
  return 'upcoming';
}

function statusFromMiles(miles: number, threshold: number): TaskStatus {
  if (miles < 0) return 'overdue';
  if (miles <= threshold) return 'due_soon';
  return 'upcoming';
}

const STATUS_RANK: Record<TaskStatus, number> = { upcoming: 0, due_soon: 1, overdue: 2 };

/**
 * Computes the next-due date/mileage and overall status for a task.
 * For `time_or_mileage` tasks, whichever dimension is more urgent wins.
 */
export function getTaskDueInfo(task: DueInfoInputTask, context: DueContext = {}): TaskDueInfo {
  const now = context.now ?? new Date();
  const today = todayISODate(now);

  const nextDueDate = getNextDueDate(task);
  const nextDueMileage = getNextDueMileage(task);

  let daysUntilDue: number | undefined;
  let dateStatus: TaskStatus | undefined;
  if (nextDueDate) {
    daysUntilDue = diffInDays(today, nextDueDate);
    dateStatus = statusFromDays(daysUntilDue, task.dueSoonThresholdDays);
  }

  let milesUntilDue: number | undefined;
  let mileageStatus: TaskStatus | undefined;
  if (nextDueMileage != null && context.currentMileage != null) {
    milesUntilDue = nextDueMileage - context.currentMileage;
    mileageStatus = statusFromMiles(milesUntilDue, task.dueSoonThresholdMiles);
  }

  let status: TaskStatus = 'upcoming';
  let dueReason: 'time' | 'mileage' | null = null;

  if (dateStatus && mileageStatus) {
    if (STATUS_RANK[mileageStatus] > STATUS_RANK[dateStatus]) {
      status = mileageStatus;
      dueReason = 'mileage';
    } else {
      status = dateStatus;
      dueReason = 'time';
    }
  } else if (dateStatus) {
    status = dateStatus;
    dueReason = 'time';
  } else if (mileageStatus) {
    status = mileageStatus;
    dueReason = 'mileage';
  }

  return { nextDueDate, nextDueMileage, daysUntilDue, milesUntilDue, status, dueReason };
}

export interface CompletionInput {
  /** Calendar date (YYYY-MM-DD) the task was completed. */
  completedDate: string;
  completedMileage?: number;
}

/**
 * Returns an updated task with a new baseline (last-completed date/mileage)
 * from which the next due date/mileage will be recalculated.
 */
export function applyTaskCompletion(
  task: MaintenanceTask,
  completion: CompletionInput,
  now: Date = new Date()
): MaintenanceTask {
  return {
    ...task,
    lastCompletedDate: completion.completedDate,
    lastCompletedMileage: completion.completedMileage ?? task.lastCompletedMileage,
    updatedAt: now.toISOString(),
  };
}

/**
 * Orders due-info entries by urgency: overdue first, then due soon, then
 * upcoming, breaking ties by how close the soonest deadline is.
 */
export function compareDueInfo(a: TaskDueInfo, b: TaskDueInfo): number {
  const rankDiff = STATUS_RANK[b.status] - STATUS_RANK[a.status];
  if (rankDiff !== 0) return rankDiff;
  return urgencyMetric(a) - urgencyMetric(b);
}

function urgencyMetric(info: TaskDueInfo): number {
  const values = [info.daysUntilDue, info.milesUntilDue].filter(
    (v): v is number => v != null
  );
  if (values.length === 0) return Infinity;
  return Math.min(...values);
}
