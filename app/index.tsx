import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Text className="text-2xl font-bold text-brand-600 dark:text-brand-400">Upkeep</Text>
      <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
        Never forget home & vehicle maintenance.
      </Text>
    </View>
  );
}
