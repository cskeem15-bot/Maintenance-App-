import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OptionCard } from '@/components/ui/OptionCard';
import { Screen } from '@/components/ui/Screen';

export default function OnboardingIndex() {
  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Let&apos;s add your first item</Text>
        <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
          We&apos;ll build a starter maintenance schedule for you automatically. You can add more later.
        </Text>

        <OptionCard
          icon="🚗"
          title="A vehicle"
          description="Car, truck, motorcycle, or RV"
          onPress={() => router.push('/add-vehicle')}
        />
        <OptionCard
          icon="🏠"
          title="A home"
          description="House, apartment, condo, or townhouse"
          onPress={() => router.push('/add-home')}
        />
      </View>
    </Screen>
  );
}
