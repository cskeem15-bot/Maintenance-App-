import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TaskListItem } from '@/components/tasks/TaskListItem';
import { vehicleDetails } from '@/core/domain/assets';
import { compareDueInfo, getTaskDueInfo, type TaskDueInfo } from '@/core/domain/dueDate';
import type { Asset, MaintenanceTask } from '@/core/domain/types';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { listAssets } from '@/lib/db/repositories/assets';
import { listTasksForHousehold } from '@/lib/db/repositories/maintenanceTasks';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { queryKeys } from '@/lib/query/keys';

interface DashboardItem {
  task: MaintenanceTask;
  asset?: Asset;
  dueInfo: TaskDueInfo;
}

export default function DashboardScreen() {
  const db = useDatabase();
  const { householdId, isSyncing, sync } = useHousehold();

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(householdId ?? 'none'),
    queryFn: () => listAssets(db, householdId as string),
    enabled: !!householdId,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasksForHousehold(householdId ?? 'none'),
    queryFn: () => listTasksForHousehold(db, householdId as string),
    enabled: !!householdId,
  });

  const items = useMemo<DashboardItem[]>(() => {
    const assets = assetsQuery.data ?? [];
    const tasks = tasksQuery.data ?? [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const now = new Date();

    return tasks
      .map((task) => {
        const asset = assetsById.get(task.assetId);
        const currentMileage = asset ? vehicleDetails(asset)?.currentMileage : undefined;
        return { task, asset, dueInfo: getTaskDueInfo(task, { now, currentMileage }) };
      })
      .sort((a, b) => compareDueInfo(a.dueInfo, b.dueInfo));
  }, [assetsQuery.data, tasksQuery.data]);

  const isLoading = assetsQuery.isLoading || tasksQuery.isLoading;
  const overdueCount = items.filter((item) => item.dueInfo.status === 'overdue').length;

  return (
    <Screen padded={false}>
      <View className="px-6 pb-4 pt-2">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Dashboard</Text>
        <Text className="mt-1 text-base text-neutral-500 dark:text-neutral-400">
          {isLoading
            ? 'Loading your maintenance schedule…'
            : overdueCount > 0
              ? `${overdueCount} task${overdueCount === 1 ? '' : 's'} overdue`
              : items.length > 0
                ? 'Everything is on track.'
                : 'Nothing to track yet.'}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.task.id}
        contentContainerClassName="px-6 pb-6"
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={sync} />}
        renderItem={({ item }) => (
          <TaskListItem
            task={item.task}
            dueInfo={item.dueInfo}
            assetName={item.asset?.name}
            onPress={() => router.push(`/asset/${item.task.assetId}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="items-center py-12">
              <Text className="mb-4 text-base text-neutral-500 dark:text-neutral-400">No maintenance tasks yet.</Text>
              <Button label="Add an asset" onPress={() => router.push('/asset/new')} />
            </View>
          )
        }
      />
    </Screen>
  );
}
