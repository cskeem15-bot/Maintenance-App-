import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PropertyForm } from '@/components/assets/PropertyForm';
import { Screen } from '@/components/ui/Screen';

export default function AddHomeScreen() {
  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} accessibilityRole="button" className="mb-4 self-start">
        <Text className="text-base text-brand-600 dark:text-brand-400">{'‹ Back'}</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Add a home</Text>
      <Text className="mb-6 mt-1 text-base text-neutral-500 dark:text-neutral-400">
        Tell us what your home has, and we&apos;ll build a starter maintenance schedule.
      </Text>

      <PropertyForm onSuccess={() => {}} />
    </Screen>
  );
}
