import { Pressable, Text, View } from 'react-native';

interface OptionCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

/** A large tappable card used for top-level choices (e.g. onboarding asset type). */
export function OptionCard({ title, description, icon, onPress }: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      className="mb-3 flex-row items-center rounded-2xl border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800"
    >
      <Text className="mr-4 text-3xl">{icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</Text>
      </View>
      <Text className="text-xl text-neutral-400">{'›'}</Text>
    </Pressable>
  );
}
