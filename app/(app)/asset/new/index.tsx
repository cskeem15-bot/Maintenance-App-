import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { OptionCard } from '@/components/ui/OptionCard';
import { Screen } from '@/components/ui/Screen';

export default function AddAssetScreen() {
  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button" className="mb-4 self-start">
        <Text className="text-base text-brand-600 dark:text-brand-400">{'‹ Back'}</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Add an asset</Text>
      <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
        We&apos;ll build a starter maintenance schedule for you automatically.
      </Text>

      <View>
        <OptionCard
          icon="🚗"
          title="A vehicle"
          description="Car, truck, motorcycle, or RV"
          onPress={() => router.push('/asset/new/vehicle')}
        />
        <OptionCard
          icon="🏠"
          title="A home"
          description="House, apartment, condo, or townhouse"
          onPress={() => router.push('/asset/new/home')}
        />
      </View>
    </Screen>
  );
}
