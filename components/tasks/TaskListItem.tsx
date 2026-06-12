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
}

export function TaskListItem({ task, dueInfo, assetName, onPress }: TaskListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${task.title}, ${describeDueInfo(dueInfo)}`}
      className="mb-3 flex-row items-start justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800"
    >
      <View className="flex-1 pr-3">
        {assetName ? (
          <Text className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">{assetName}</Text>
        ) : null}
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">{task.title}</Text>
        <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{describeDueInfo(dueInfo)}</Text>
      </View>
      <StatusBadge status={dueInfo.status} />
    </Pressable>
  );
}
