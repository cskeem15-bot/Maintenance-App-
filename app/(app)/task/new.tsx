import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { TaskForm } from '@/components/tasks/TaskForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { getAsset } from '@/lib/db/repositories/assets';
import { queryKeys } from '@/lib/query/keys';

export default function NewTaskScreen() {
  const db = useDatabase();
  const { assetId } = useLocalSearchParams<{ assetId: string }>();

  const assetQuery = useQuery({
    queryKey: queryKeys.asset(assetId),
    queryFn: () => getAsset(db, assetId),
    enabled: !!assetId,
  });

  const asset = assetQuery.data;

  if (assetQuery.isLoading || !asset) {
    return <LoadingScreen />;
  }

  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} accessibilityRole="button" className="mb-4 self-start">
        <Text className="text-base text-brand-600 dark:text-brand-400">{'‹ Back'}</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Add a task</Text>
      <Text className="mb-6 mt-1 text-base text-neutral-500 dark:text-neutral-400">{asset.name}</Text>

      <TaskForm asset={asset} onSuccess={() => router.back()} />
    </Screen>
  );
}
