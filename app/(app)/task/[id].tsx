import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TaskForm } from '@/components/tasks/TaskForm';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { hasPermission } from '@/core/domain/permissions';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { getAsset } from '@/lib/db/repositories/assets';
import { deleteTask, getTask } from '@/lib/db/repositories/maintenanceTasks';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { queryKeys } from '@/lib/query/keys';

export default function EditTaskScreen() {
  const db = useDatabase();
  const { householdId, role, sync } = useHousehold();
  const canDeleteTask = !!role && hasPermission(role, 'task:delete');
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const taskQuery = useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => getTask(db, id),
    enabled: !!id,
  });

  const task = taskQuery.data;

  const assetQuery = useQuery({
    queryKey: queryKeys.asset(task?.assetId ?? 'none'),
    queryFn: () => getAsset(db, task?.assetId as string),
    enabled: !!task,
  });

  const asset = assetQuery.data;

  const removeTask = useMutation({
    mutationFn: async () => {
      if (!task) return;
      await deleteTask(db, task.id);
    },
    onSuccess: async () => {
      if (task && householdId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.tasksForAsset(task.assetId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasksForHousehold(householdId) }),
        ]);
        void sync();
      }
      router.back();
    },
    onError: (err) => {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this task.');
    },
  });

  if (taskQuery.isLoading || assetQuery.isLoading || !task || !asset) {
    return <LoadingScreen />;
  }

  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} accessibilityRole="button" className="mb-4 self-start">
        <Text className="text-base text-brand-600 dark:text-brand-400">{'‹ Back'}</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Edit task</Text>
      <Text className="mb-6 mt-1 text-base text-neutral-500 dark:text-neutral-400">{asset.name}</Text>

      <TaskForm asset={asset} task={task} onSuccess={() => router.back()} />

      {deleteError ? (
        <Text className="mt-4 text-sm text-red-600" accessibilityRole="alert">
          {deleteError}
        </Text>
      ) : null}

      {canDeleteTask ? (
        <View className="mt-6">
          <Button label="Delete task" variant="destructive" onPress={() => removeTask.mutate()} loading={removeTask.isPending} />
        </View>
      ) : null}
    </Screen>
  );
}
