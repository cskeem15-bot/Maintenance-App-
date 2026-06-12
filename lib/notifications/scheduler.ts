import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { buildReminderContent, computeReminderFireTime, type QuietHours } from '@/core/domain/notifications';
import type { TaskDueInfo } from '@/core/domain/dueDate';
import type { MaintenanceTask } from '@/core/domain/types';

export const TASK_REMINDER_CATEGORY = 'task-reminder';
export const TASK_REMINDER_CHANNEL = 'task-reminders';
export const MARK_DONE_ACTION = 'mark-done';
export const SNOOZE_ACTION = 'snooze';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permissions if not already granted. Returns whether
 * the app is allowed to show notifications (including iOS provisional auth).
 */
export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * Registers the "Mark done" / "Snooze" action buttons shown on task reminder
 * notifications, and the Android notification channel they're delivered on.
 * Safe to call multiple times (e.g. on every app start).
 */
export async function registerTaskReminderCategoryAsync(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY, [
    {
      identifier: MARK_DONE_ACTION,
      buttonTitle: 'Mark done',
      options: { opensAppToForeground: false },
    },
    {
      identifier: SNOOZE_ACTION,
      buttonTitle: 'Snooze 1 day',
      options: { opensAppToForeground: false },
    },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL, {
      name: 'Maintenance reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export interface ScheduleTaskReminderParams {
  task: Pick<MaintenanceTask, 'id' | 'title'>;
  assetName: string;
  dueInfo: TaskDueInfo;
  /** Minutes before the due date to fire the reminder (from the user's profile). */
  leadTimeMinutes: number;
  quietHours?: QuietHours;
  now?: Date;
}

/**
 * Schedules a local notification reminding the user about a task's next due
 * date, respecting lead time and quiet hours. Returns the notification
 * identifier (for later cancellation), or undefined if the task has no
 * upcoming due date to remind about (e.g. mileage-only tasks).
 */
export async function scheduleTaskReminderAsync(params: ScheduleTaskReminderParams): Promise<string | undefined> {
  const { task, assetName, dueInfo, leadTimeMinutes, quietHours, now } = params;
  if (!dueInfo.nextDueDate) return undefined;

  const fireDate = computeReminderFireTime(dueInfo.nextDueDate, leadTimeMinutes, quietHours, now);
  const content = buildReminderContent(assetName, task, dueInfo);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      categoryIdentifier: TASK_REMINDER_CATEGORY,
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: TASK_REMINDER_CHANNEL,
    },
  });
}

export async function cancelTaskReminderAsync(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllTaskRemindersAsync(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
