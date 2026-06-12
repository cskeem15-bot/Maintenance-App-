import { Pressable, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { describeDueInfo } from '@/core/domain/notifications';
import type { TaskDueInfo } from '@/core/domain/dueDate';
import type { MaintenanceTask } from '@/core/domain/types';

interface TaskListItemProps {
  task: MaintenanceTask;
  dueInfo: TaskDueInfo;
  /** Shown as a small label above the title (e.g. the owning asset's name). */
  assetName?: string;
  onPress?: () => void;
  /** When provided, shows a "Mark done" button that logs a service record. */
  onComplete?: () => void;
}

export function TaskListItem({ task, dueInfo, assetName, onPress, onComplete }: TaskListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${task.title}, ${describeDueInfo(dueInfo)}`}
      className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {assetName ? (
            <Text className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">{assetName}</Text>
          ) : null}
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">{task.title}</Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{describeDueInfo(dueInfo)}</Text>
        </View>
        <StatusBadge status={dueInfo.status} />
      </View>

      {onComplete ? (
        <Pressable
          onPress={onComplete}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${task.title} as done`}
          className="mt-3 self-start rounded-lg bg-brand-600/10 px-3 py-1.5 active:bg-brand-600/20"
        >
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">Mark done</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
