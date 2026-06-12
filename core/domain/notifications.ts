import type { TaskDueInfo } from './dueDate';
import type { MaintenanceTask } from './types';

export interface QuietHours {
  /** "HH:MM" or "HH:MM:SS" in the user's local time. */
  start?: string | null;
  end?: string | null;
}

function parseTimeOfDay(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function setTimeOfDay(date: Date, minutesSinceMidnight: number): Date {
  const result = new Date(date);
  result.setHours(Math.floor(minutesSinceMidnight / 60), minutesSinceMidnight % 60, 0, 0);
  return result;
}

/** Local midnight (start of day) for a "YYYY-MM-DD" calendar date. */
function localMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** True if `date`'s local time-of-day falls within the quiet hours window (handles overnight windows). */
export function isWithinQuietHours(date: Date, quietHours: QuietHours): boolean {
  if (!quietHours.start || !quietHours.end) return false;

  const startMinutes = parseTimeOfDay(quietHours.start);
  const endMinutes = parseTimeOfDay(quietHours.end);
  if (startMinutes === endMinutes) return false;

  const minutes = date.getHours() * 60 + date.getMinutes();
  if (startMinutes < endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }
  // Overnight window, e.g. 22:00 - 07:00.
  return minutes >= startMinutes || minutes < endMinutes;
}

/** If `date` falls within quiet hours, pushes it to the next occurrence of `quietHours.end`. */
export function pushPastQuietHours(date: Date, quietHours: QuietHours): Date {
  if (!isWithinQuietHours(date, quietHours)) return date;

  const endMinutes = parseTimeOfDay(quietHours.end as string);
  const result = setTimeOfDay(date, endMinutes);
  if (result.getTime() <= date.getTime()) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Computes when a reminder for `dueDate` should fire, given how far in
 * advance the user wants to be notified (`leadTimeMinutes`) and their quiet
 * hours. If the computed time has already passed, returns `now` so the
 * notification fires immediately instead of in the past.
 */
export function computeReminderFireTime(
  dueDate: string,
  leadTimeMinutes: number,
  quietHours: QuietHours = {},
  now: Date = new Date()
): Date {
  const due = localMidnight(dueDate);
  const naive = new Date(due.getTime() - leadTimeMinutes * 60_000);
  const adjusted = pushPastQuietHours(naive, quietHours);
  return adjusted.getTime() < now.getTime() ? now : adjusted;
}

export interface ReminderContent {
  title: string;
  body: string;
}

/** Human-readable description of how urgent a task's due info is, e.g. "Due in 3 days" or "Overdue by 200 mi". */
export function describeDueInfo(dueInfo: TaskDueInfo): string {
  const { status, dueReason, daysUntilDue, milesUntilDue } = dueInfo;

  if (dueReason === 'mileage' && milesUntilDue != null) {
    if (status === 'overdue') return `Overdue by ${Math.abs(milesUntilDue)} mi`;
    if (milesUntilDue === 0) return 'Due now';
    return `Due in ${milesUntilDue} mi`;
  }

  if (dueReason === 'time' && daysUntilDue != null) {
    if (status === 'overdue') {
      const days = Math.abs(daysUntilDue);
      return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
    }
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDue} days`;
  }

  switch (status) {
    case 'overdue':
      return 'Overdue';
    case 'due_soon':
      return 'Due soon';
    default:
      return 'Upcoming';
  }
}

/** Builds the title/body for a task reminder push/local notification. */
export function buildReminderContent(
  assetName: string,
  task: Pick<MaintenanceTask, 'title'>,
  dueInfo: TaskDueInfo
): ReminderContent {
  return {
    title: task.title,
    body: `${assetName} • ${describeDueInfo(dueInfo)}`,
  };
}
