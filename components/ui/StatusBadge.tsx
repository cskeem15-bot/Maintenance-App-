import { Text, View } from 'react-native';

import type { TaskStatus } from '@/core/domain/types';

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  upcoming: { bg: 'bg-status-upcoming/10', text: 'text-status-upcoming', label: 'Upcoming' },
  due_soon: { bg: 'bg-status-due/10', text: 'text-status-due', label: 'Due soon' },
  overdue: { bg: 'bg-status-overdue/10', text: 'text-status-overdue', label: 'Overdue' },
};

interface StatusBadgeProps {
  status: TaskStatus;
  /** Override the default status label (e.g. with a more specific description). */
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${style.bg}`}>
      <Text className={`text-xs font-semibold ${style.text}`}>{label ?? style.label}</Text>
    </View>
  );
}
