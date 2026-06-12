import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { listAssets } from '@/lib/db/repositories/assets';
import { assetIcon, formatAssetSubtitle } from '@/lib/format/asset';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { queryKeys } from '@/lib/query/keys';

export default function AssetsScreen() {
  const db = useDatabase();
  const { householdId, isSyncing, sync } = useHousehold();

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(householdId ?? 'none'),
    queryFn: () => listAssets(db, householdId as string),
    enabled: !!householdId,
  });

  const assets = assetsQuery.data ?? [];

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Assets</Text>
        <Button label="Add" onPress={() => router.push('/asset/new')} />
      </View>

      <FlatList
        data={assets}
        keyExtractor={(asset) => asset.id}
        contentContainerClassName="px-6 pb-6"
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={sync} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/asset/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            className="mb-3 flex-row items-center rounded-2xl border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800"
          >
            <Text className="mr-4 text-3xl">{assetIcon(item)}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">{item.name}</Text>
              <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{formatAssetSubtitle(item)}</Text>
            </View>
            <Text className="text-xl text-neutral-400">{'›'}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          assetsQuery.isLoading ? null : (
            <View className="items-center py-12">
              <Text className="mb-4 text-base text-neutral-500 dark:text-neutral-400">No assets yet.</Text>
              <Button label="Add an asset" onPress={() => router.push('/asset/new')} />
            </View>
          )
        }
      />
    </Screen>
  );
}
