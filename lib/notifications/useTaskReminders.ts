import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

import { vehicleDetails } from '@/core/domain/assets';
import { applyTaskCompletion, getTaskDueInfo, todayISODate } from '@/core/domain/dueDate';
import type { QuietHours } from '@/core/domain/notifications';
import type { ServiceRecord } from '@/core/domain/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { listAssets } from '@/lib/db/repositories/assets';
import { getTask, listTasksForHousehold, saveTask } from '@/lib/db/repositories/maintenanceTasks';
import { getProfile } from '@/lib/db/repositories/profiles';
import { saveServiceRecord } from '@/lib/db/repositories/serviceRecords';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { generateId } from '@/lib/ids';
import {
  MARK_DONE_ACTION,
  SNOOZE_ACTION,
  TASK_REMINDER_CATEGORY,
  TASK_REMINDER_CHANNEL,
  cancelAllTaskRemindersAsync,
  registerTaskReminderCategoryAsync,
  requestNotificationPermissionsAsync,
  scheduleTaskReminderAsync,
} from '@/lib/notifications/scheduler';
import { queryKeys } from '@/lib/query/keys';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Registers the task-reminder notification category, reschedules local
 * reminders whenever household data changes, and handles the "Mark done" /
 * "Snooze" actions on delivered reminders. Call once near the app root.
 */
export function useTaskReminders(): void {
  const db = useDatabase();
  const { user } = useAuth();
  const { householdId, sync } = useHousehold();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [permissionGranted, setPermissionGranted] = useState(false);

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasksForHousehold(householdId ?? 'none'),
    queryFn: () => listTasksForHousehold(db, householdId as string),
    enabled: !!householdId,
  });

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(householdId ?? 'none'),
    queryFn: () => listAssets(db, householdId as string),
    enabled: !!householdId,
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? 'none'),
    queryFn: () => getProfile(db, userId as string),
    enabled: !!userId,
  });

  // Request permission and register the "Mark done" / "Snooze" actions once.
  useEffect(() => {
    let cancelled = false;
    requestNotificationPermissionsAsync().then(async (granted) => {
      if (cancelled) return;
      if (granted) await registerTaskReminderCategoryAsync();
      setPermissionGranted(granted);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reschedule reminders whenever the household's tasks, assets, or notification preferences change.
  useEffect(() => {
    if (!permissionGranted) return;

    const tasks = tasksQuery.data;
    const assets = assetsQuery.data;
    if (!tasks || !assets) return;

    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const profile = profileQuery.data;
    const quietHours: QuietHours = { start: profile?.quietHoursStart, end: profile?.quietHoursEnd };
    const leadTimeMinutes = profile?.notificationLeadTimeMinutes ?? 0;

    let cancelled = false;
    (async () => {
      await cancelAllTaskRemindersAsync();
      const now = new Date();

      for (const task of tasks) {
        if (cancelled) return;

        const asset = assetsById.get(task.assetId);
        const currentMileage = asset ? vehicleDetails(asset)?.currentMileage : undefined;
        const dueInfo = getTaskDueInfo(task, { now, currentMileage });

        // Overdue tasks would have their reminder fire immediately on every
        // reschedule; they're already surfaced on the dashboard.
        if (dueInfo.status === 'overdue' || !dueInfo.nextDueDate) continue;

        await scheduleTaskReminderAsync({
          task,
          assetName: asset?.name ?? 'Asset',
          dueInfo,
          leadTimeMinutes,
          quietHours,
          now,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permissionGranted, tasksQuery.data, assetsQuery.data, profileQuery.data]);

  // Handle "Mark done" / "Snooze" taps on delivered reminders.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const taskId = response.notification.request.content.data?.taskId;
      if (typeof taskId !== 'string' || !user) return;

      const task = await getTask(db, taskId);
      if (!task) return;

      if (response.actionIdentifier === MARK_DONE_ACTION) {
        const asset = assetsQuery.data?.find((a) => a.id === task.assetId);
        const vehicle = asset ? vehicleDetails(asset) : undefined;
        const completedDate = todayISODate();
        const completedMileage = task.triggerType !== 'time' ? vehicle?.currentMileage : undefined;

        const record: ServiceRecord = {
          id: generateId(),
          taskId: task.id,
          assetId: task.assetId,
          completedDate,
          completedMileage,
          createdAt: new Date().toISOString(),
        };
        await saveServiceRecord(db, record, user.id);
        await saveTask(db, applyTaskCompletion(task, { completedDate, completedMileage }));

        if (householdId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.tasksForHousehold(householdId) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.tasksForAsset(task.assetId) }),
          ]);
          void sync();
        }
      } else if (response.actionIdentifier === SNOOZE_ACTION) {
        const { title, body } = response.notification.request.content;
        await Notifications.scheduleNotificationAsync({
          content: { title, body, categoryIdentifier: TASK_REMINDER_CATEGORY, data: { taskId } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(Date.now() + ONE_DAY_MS),
            channelId: TASK_REMINDER_CHANNEL,
          },
        });
      }
    });

    return () => subscription.remove();
  }, [db, user, householdId, sync, queryClient, assetsQuery.data]);
}
