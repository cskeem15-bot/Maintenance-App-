import {
  buildReminderContent,
  computeReminderFireTime,
  describeDueInfo,
  isWithinQuietHours,
  pushPastQuietHours,
} from '../notifications';
import type { TaskDueInfo } from '../dueDate';

describe('isWithinQuietHours', () => {
  it('returns false when quiet hours are not configured', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 0), {})).toBe(false);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 0), { start: '22:00' })).toBe(false);
  });

  it('detects times within a same-day window', () => {
    const quietHours = { start: '13:00', end: '14:00' };
    expect(isWithinQuietHours(new Date(2026, 0, 1, 13, 30), quietHours)).toBe(true);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 13, 0), quietHours)).toBe(true); // inclusive start
    expect(isWithinQuietHours(new Date(2026, 0, 1, 14, 0), quietHours)).toBe(false); // exclusive end
    expect(isWithinQuietHours(new Date(2026, 0, 1, 12, 59), quietHours)).toBe(false);
  });

  it('detects times within an overnight window', () => {
    const quietHours = { start: '22:00', end: '07:00' };
    expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 0), quietHours)).toBe(true);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 3, 0), quietHours)).toBe(true);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 7, 0), quietHours)).toBe(false); // exclusive end
    expect(isWithinQuietHours(new Date(2026, 0, 1, 12, 0), quietHours)).toBe(false);
  });

  it('treats a zero-length window as no quiet hours', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 10, 0), { start: '10:00', end: '10:00' })).toBe(false);
  });
});

describe('pushPastQuietHours', () => {
  it('leaves times outside quiet hours unchanged', () => {
    const date = new Date(2026, 0, 1, 8, 0);
    expect(pushPastQuietHours(date, { start: '22:00', end: '07:00' })).toEqual(date);
  });

  it('pushes a same-day time forward to the end of quiet hours', () => {
    const date = new Date(2026, 0, 1, 13, 30);
    const result = pushPastQuietHours(date, { start: '13:00', end: '14:00' });
    expect(result).toEqual(new Date(2026, 0, 1, 14, 0));
  });

  it('pushes an overnight time to the next morning', () => {
    const date = new Date(2026, 0, 1, 23, 0);
    const result = pushPastQuietHours(date, { start: '22:00', end: '07:00' });
    expect(result).toEqual(new Date(2026, 0, 2, 7, 0));
  });

  it('pushes a time already past midnight to the same-day end', () => {
    const date = new Date(2026, 0, 1, 3, 0);
    const result = pushPastQuietHours(date, { start: '22:00', end: '07:00' });
    expect(result).toEqual(new Date(2026, 0, 1, 7, 0));
  });
});

describe('computeReminderFireTime', () => {
  it('fires `leadTimeMinutes` before local midnight of the due date', () => {
    const fireTime = computeReminderFireTime('2026-06-15', 60, {}, new Date(2026, 5, 1));
    expect(fireTime).toEqual(new Date(2026, 5, 14, 23, 0));
  });

  it('pushes the fire time past quiet hours', () => {
    // 1 day lead time -> naive fire time is midnight of the 14th, which falls
    // inside a 22:00-07:00 quiet window and should push to 07:00 on the 14th.
    const fireTime = computeReminderFireTime(
      '2026-06-15',
      24 * 60,
      { start: '22:00', end: '07:00' },
      new Date(2026, 5, 1)
    );
    expect(fireTime).toEqual(new Date(2026, 5, 14, 7, 0));
  });

  it('clamps to `now` if the computed fire time is already in the past', () => {
    const now = new Date(2026, 5, 20, 9, 0);
    const fireTime = computeReminderFireTime('2026-06-15', 60, {}, now);
    expect(fireTime).toEqual(now);
  });
});

describe('describeDueInfo', () => {
  const base: TaskDueInfo = { status: 'upcoming', dueReason: null };

  it('describes upcoming time-based tasks', () => {
    expect(describeDueInfo({ ...base, status: 'upcoming', dueReason: 'time', daysUntilDue: 10 })).toBe(
      'Due in 10 days'
    );
    expect(describeDueInfo({ ...base, status: 'due_soon', dueReason: 'time', daysUntilDue: 1 })).toBe('Due tomorrow');
    expect(describeDueInfo({ ...base, status: 'due_soon', dueReason: 'time', daysUntilDue: 0 })).toBe('Due today');
  });

  it('describes overdue time-based tasks', () => {
    expect(describeDueInfo({ ...base, status: 'overdue', dueReason: 'time', daysUntilDue: -1 })).toBe(
      'Overdue by 1 day'
    );
    expect(describeDueInfo({ ...base, status: 'overdue', dueReason: 'time', daysUntilDue: -5 })).toBe(
      'Overdue by 5 days'
    );
  });

  it('describes mileage-based tasks', () => {
    expect(describeDueInfo({ ...base, status: 'due_soon', dueReason: 'mileage', milesUntilDue: 250 })).toBe(
      'Due in 250 mi'
    );
    expect(describeDueInfo({ ...base, status: 'due_soon', dueReason: 'mileage', milesUntilDue: 0 })).toBe('Due now');
    expect(describeDueInfo({ ...base, status: 'overdue', dueReason: 'mileage', milesUntilDue: -300 })).toBe(
      'Overdue by 300 mi'
    );
  });

  it('falls back to status text when no reason is available', () => {
    expect(describeDueInfo({ status: 'overdue', dueReason: null })).toBe('Overdue');
    expect(describeDueInfo({ status: 'due_soon', dueReason: null })).toBe('Due soon');
    expect(describeDueInfo({ status: 'upcoming', dueReason: null })).toBe('Upcoming');
  });
});

describe('buildReminderContent', () => {
  it('combines the task title with a due description', () => {
    const content = buildReminderContent(
      '2018 Honda Civic',
      { title: 'Oil & filter change' },
      { status: 'due_soon', dueReason: 'time', daysUntilDue: 3 }
    );
    expect(content).toEqual({
      title: 'Oil & filter change',
      body: '2018 Honda Civic • Due in 3 days',
    });
  });
});
