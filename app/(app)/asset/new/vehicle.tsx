import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { VehicleForm } from '@/components/assets/VehicleForm';
import { Screen } from '@/components/ui/Screen';

export default function AddVehicleScreen() {
  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} accessibilityRole="button" className="mb-4 self-start">
        <Text className="text-base text-brand-600 dark:text-brand-400">{'‹ Back'}</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Add a vehicle</Text>
      <Text className="mb-6 mt-1 text-base text-neutral-500 dark:text-neutral-400">
        Decode your VIN for a head start, or enter the details yourself.
      </Text>

      <VehicleForm onSuccess={(asset) => router.replace(`/asset/${asset.id}`)} />
    </Screen>
  );
}
