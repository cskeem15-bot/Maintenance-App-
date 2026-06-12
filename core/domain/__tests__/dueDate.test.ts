import {
  addMonths,
  applyTaskCompletion,
  compareDueInfo,
  diffInDays,
  getNextDueDate,
  getNextDueMileage,
  getTaskDueInfo,
  todayISODate,
} from '../dueDate';
import type { MaintenanceTask } from '../types';

function makeTask(overrides: Partial<MaintenanceTask> = {}): MaintenanceTask {
  return {
    id: 'task-1',
    assetId: 'asset-1',
    title: 'Oil change',
    category: 'engine',
    triggerType: 'time',
    intervalMonths: 6,
    lastCompletedDate: '2026-01-01',
    dueSoonThresholdDays: 14,
    dueSoonThresholdMiles: 500,
    priority: 'medium',
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('addMonths', () => {
  it('adds whole months without crossing a year boundary', () => {
    expect(addMonths('2026-01-15', 2)).toBe('2026-03-15');
  });

  it('rolls over to the next year', () => {
    expect(addMonths('2026-11-01', 3)).toBe('2027-02-01');
  });

  it('clamps to the last day of a shorter target month (non-leap year)', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
  });

  it('clamps to Feb 29 in a leap year', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('handles a zero-month interval as a no-op', () => {
    expect(addMonths('2026-06-12', 0)).toBe('2026-06-12');
  });
});

describe('diffInDays', () => {
  it('returns a positive number when `to` is later', () => {
    expect(diffInDays('2026-06-01', '2026-06-10')).toBe(9);
  });

  it('returns a negative number when `to` is earlier', () => {
    expect(diffInDays('2026-06-10', '2026-06-01')).toBe(-9);
  });

  it('returns zero for the same date', () => {
    expect(diffInDays('2026-06-12', '2026-06-12')).toBe(0);
  });
});

describe('todayISODate', () => {
  it('formats a date as YYYY-MM-DD using local calendar fields', () => {
    const date = new Date(2026, 5, 12); // June 12, 2026 (month is 0-indexed)
    expect(todayISODate(date)).toBe('2026-06-12');
  });
});

describe('getNextDueDate / getNextDueMileage', () => {
  it('computes the next due date for a time-based task', () => {
    const task = makeTask({ triggerType: 'time', intervalMonths: 6, lastCompletedDate: '2026-01-01' });
    expect(getNextDueDate(task)).toBe('2026-07-01');
  });

  it('returns undefined next due date for a pure mileage task', () => {
    const task = makeTask({ triggerType: 'mileage', intervalMonths: undefined });
    expect(getNextDueDate(task)).toBeUndefined();
  });

  it('computes the next due mileage for a mileage-based task', () => {
    const task = makeTask({
      triggerType: 'mileage',
      intervalMonths: undefined,
      intervalMiles: 5000,
      lastCompletedMileage: 30000,
    });
    expect(getNextDueMileage(task)).toBe(35000);
  });

  it('returns undefined next due mileage for a pure time task', () => {
    const task = makeTask({ triggerType: 'time' });
    expect(getNextDueMileage(task)).toBeUndefined();
  });

  it('returns undefined next due mileage when lastCompletedMileage is missing', () => {
    const task = makeTask({ triggerType: 'time_or_mileage', intervalMiles: 5000, lastCompletedMileage: undefined });
    expect(getNextDueMileage(task)).toBeUndefined();
  });
});

describe('getTaskDueInfo - time-based tasks', () => {
  const now = new Date(2026, 5, 12); // 2026-06-12

  it('is "upcoming" when far from the due date', () => {
    const task = makeTask({ lastCompletedDate: '2026-01-01', intervalMonths: 6 }); // due 2026-07-01
    const info = getTaskDueInfo(task, { now });
    expect(info.nextDueDate).toBe('2026-07-01');
    expect(info.daysUntilDue).toBe(19);
    expect(info.status).toBe('upcoming');
    expect(info.dueReason).toBe('time');
  });

  it('is "due_soon" within the threshold window', () => {
    const task = makeTask({ lastCompletedDate: '2025-12-15', intervalMonths: 6, dueSoonThresholdDays: 14 }); // due 2026-06-15
    const info = getTaskDueInfo(task, { now });
    expect(info.nextDueDate).toBe('2026-06-15');
    expect(info.daysUntilDue).toBe(3);
    expect(info.status).toBe('due_soon');
  });

  it('is "overdue" once the due date has passed', () => {
    const task = makeTask({ lastCompletedDate: '2025-12-01', intervalMonths: 6 }); // due 2026-06-01
    const info = getTaskDueInfo(task, { now });
    expect(info.nextDueDate).toBe('2026-06-01');
    expect(info.daysUntilDue).toBe(-11);
    expect(info.status).toBe('overdue');
  });

  it('treats the boundary day of the due-soon window as due_soon', () => {
    const task = makeTask({ lastCompletedDate: '2026-05-29', intervalMonths: 1, dueSoonThresholdDays: 14 }); // due 2026-06-29, 17 days out -> upcoming
    const info = getTaskDueInfo(task, { now });
    expect(info.daysUntilDue).toBe(17);
    expect(info.status).toBe('upcoming');
  });
});

describe('getTaskDueInfo - mileage-based tasks', () => {
  const now = new Date(2026, 5, 12);

  it('is "upcoming" when far from the due mileage', () => {
    const task = makeTask({
      triggerType: 'mileage',
      intervalMonths: undefined,
      intervalMiles: 5000,
      lastCompletedMileage: 30000,
      dueSoonThresholdMiles: 500,
    });
    const info = getTaskDueInfo(task, { now, currentMileage: 33000 });
    expect(info.nextDueMileage).toBe(35000);
    expect(info.milesUntilDue).toBe(2000);
    expect(info.status).toBe('upcoming');
    expect(info.dueReason).toBe('mileage');
  });

  it('is "due_soon" within the mileage threshold', () => {
    const task = makeTask({
      triggerType: 'mileage',
      intervalMonths: undefined,
      intervalMiles: 5000,
      lastCompletedMileage: 30000,
      dueSoonThresholdMiles: 500,
    });
    const info = getTaskDueInfo(task, { now, currentMileage: 34600 });
    expect(info.milesUntilDue).toBe(400);
    expect(info.status).toBe('due_soon');
  });

  it('is "overdue" once mileage has exceeded the interval', () => {
    const task = makeTask({
      triggerType: 'mileage',
      intervalMonths: undefined,
      intervalMiles: 5000,
      lastCompletedMileage: 30000,
      dueSoonThresholdMiles: 500,
    });
    const info = getTaskDueInfo(task, { now, currentMileage: 35500 });
    expect(info.milesUntilDue).toBe(-500);
    expect(info.status).toBe('overdue');
  });

  it('produces no mileage due info when current mileage is unknown', () => {
    const task = makeTask({
      triggerType: 'mileage',
      intervalMonths: undefined,
      intervalMiles: 5000,
      lastCompletedMileage: 30000,
    });
    const info = getTaskDueInfo(task, { now });
    expect(info.nextDueMileage).toBe(35000);
    expect(info.milesUntilDue).toBeUndefined();
    expect(info.status).toBe('upcoming');
    expect(info.dueReason).toBeNull();
  });
});

describe('getTaskDueInfo - combined time_or_mileage tasks', () => {
  const now = new Date(2026, 5, 12);

  const baseTask = (overrides: Partial<MaintenanceTask> = {}) =>
    makeTask({
      triggerType: 'time_or_mileage',
      intervalMonths: 6,
      intervalMiles: 5000,
      lastCompletedDate: '2026-01-01', // due 2026-07-01 -> 19 days out, upcoming
      lastCompletedMileage: 30000,
      dueSoonThresholdDays: 14,
      dueSoonThresholdMiles: 500,
      ...overrides,
    });

  it('uses mileage when mileage is more urgent than time', () => {
    const task = baseTask();
    const info = getTaskDueInfo(task, { now, currentMileage: 34900 }); // 100 miles left -> due_soon
    expect(info.status).toBe('due_soon');
    expect(info.dueReason).toBe('mileage');
  });

  it('uses time when time is more urgent than mileage', () => {
    const task = baseTask({ lastCompletedDate: '2025-12-15' }); // due 2026-06-15 -> 3 days out, due_soon
    const info = getTaskDueInfo(task, { now, currentMileage: 31000 }); // 4000 miles left -> upcoming
    expect(info.status).toBe('due_soon');
    expect(info.dueReason).toBe('time');
  });

  it('is overdue if either dimension is overdue', () => {
    const task = baseTask();
    const info = getTaskDueInfo(task, { now, currentMileage: 35200 }); // mileage overdue, time upcoming
    expect(info.status).toBe('overdue');
    expect(info.dueReason).toBe('mileage');
  });
});

describe('applyTaskCompletion', () => {
  it('resets the baseline date and mileage and recomputes the next due date', () => {
    const task = makeTask({
      triggerType: 'time_or_mileage',
      intervalMonths: 6,
      intervalMiles: 5000,
      lastCompletedDate: '2026-01-01',
      lastCompletedMileage: 30000,
    });

    const updated = applyTaskCompletion(
      task,
      { completedDate: '2026-06-12', completedMileage: 35200 },
      new Date(2026, 5, 12)
    );

    expect(updated.lastCompletedDate).toBe('2026-06-12');
    expect(updated.lastCompletedMileage).toBe(35200);
    expect(getNextDueDate(updated)).toBe('2026-12-12');
    expect(getNextDueMileage(updated)).toBe(40200);
  });

  it('keeps the previous mileage baseline if no mileage is provided', () => {
    const task = makeTask({ lastCompletedMileage: 30000 });
    const updated = applyTaskCompletion(task, { completedDate: '2026-06-12' });
    expect(updated.lastCompletedMileage).toBe(30000);
  });
});

describe('compareDueInfo', () => {
  const now = new Date(2026, 5, 12);

  it('sorts overdue before due_soon before upcoming', () => {
    const overdue = getTaskDueInfo(makeTask({ lastCompletedDate: '2025-01-01', intervalMonths: 1 }), { now });
    const dueSoon = getTaskDueInfo(makeTask({ lastCompletedDate: '2026-06-01', intervalMonths: 1, dueSoonThresholdDays: 30 }), { now });
    const upcoming = getTaskDueInfo(makeTask({ lastCompletedDate: '2026-06-01', intervalMonths: 6 }), { now });

    const sorted = [upcoming, overdue, dueSoon].sort(compareDueInfo);
    expect(sorted.map((s) => s.status)).toEqual(['overdue', 'due_soon', 'upcoming']);
  });

  it('breaks ties within the same status by how soon the deadline is', () => {
    const soon = getTaskDueInfo(makeTask({ lastCompletedDate: '2026-06-10', intervalMonths: 1, dueSoonThresholdDays: 30 }), { now }); // due 2026-07-10 -> 28 days
    const sooner = getTaskDueInfo(makeTask({ lastCompletedDate: '2026-06-01', intervalMonths: 1, dueSoonThresholdDays: 30 }), { now }); // due 2026-07-01 -> 19 days

    const sorted = [soon, sooner].sort(compareDueInfo);
    expect(sorted[0]).toBe(sooner);
  });
});
