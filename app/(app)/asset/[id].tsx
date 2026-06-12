import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { TaskListItem } from '@/components/tasks/TaskListItem';
import { vehicleDetails } from '@/core/domain/assets';
import { compareDueInfo, getTaskDueInfo } from '@/core/domain/dueDate';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { getAsset } from '@/lib/db/repositories/assets';
import { listTasksForAsset } from '@/lib/db/repositories/maintenanceTasks';
import { assetIcon, formatAssetDetails, formatAssetSubtitle } from '@/lib/format/asset';
import { queryKeys } from '@/lib/query/keys';

export default function AssetDetailScreen() {
  const db = useDatabase();
  const { id } = useLocalSearchParams<{ id: string }>();

  const assetQuery = useQuery({
    queryKey: queryKeys.asset(id),
    queryFn: () => getAsset(db, id),
    enabled: !!id,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasksForAsset(id),
    queryFn: () => listTasksForAsset(db, id),
    enabled: !!id,
  });

  const asset = assetQuery.data;

  const items = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const now = new Date();
    const currentMileage = asset ? vehicleDetails(asset)?.currentMileage : undefined;
    return tasks
      .map((task) => ({ task, dueInfo: getTaskDueInfo(task, { now, currentMileage }) }))
      .sort((a, b) => compareDueInfo(a.dueInfo, b.dueInfo));
  }, [tasksQuery.data, asset]);

  if (assetQuery.isLoading || !asset) {
    return <LoadingScreen />;
  }

  return (
    <Screen padded={false}>
      <View className="px-6 pb-2 pt-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" className="mb-3 self-start">
          <Text className="text-base text-brand-600 dark:text-brand-400">{'‹ Back'}</Text>
        </Pressable>

        <View className="flex-row items-center">
          <Text className="mr-3 text-3xl">{assetIcon(asset)}</Text>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{asset.name}</Text>
            <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{formatAssetSubtitle(asset)}</Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {formatAssetDetails(asset).map((detail) => (
            <View key={detail.label} className="flex-row justify-between py-1">
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">{detail.label}</Text>
              <Text className="text-sm font-medium text-neutral-900 dark:text-white">{detail.value}</Text>
            </View>
          ))}
        </View>

        <Text className="mb-2 mt-6 text-lg font-semibold text-neutral-900 dark:text-white">Maintenance</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.task.id}
        contentContainerClassName="px-6 pb-6"
        renderItem={({ item }) => <TaskListItem task={item.task} dueInfo={item.dueInfo} />}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-base text-neutral-500 dark:text-neutral-400">No maintenance tasks yet.</Text>
          </View>
        }
      />
    </Screen>
  );
}
