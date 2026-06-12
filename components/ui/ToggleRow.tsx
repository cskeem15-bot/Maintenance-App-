import { Switch, Text, View } from 'react-native';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-100 py-3 dark:border-neutral-800">
      <Text className="flex-1 pr-4 text-base text-neutral-900 dark:text-neutral-100">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} trackColor={{ true: '#2563eb' }} />
    </View>
  );
}
