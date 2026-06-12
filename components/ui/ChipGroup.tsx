import { Pressable, Text, View } from 'react-native';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of selectable chips, used for small fixed-choice fields (priority, trigger type, etc.). */
export function ChipGroup<T extends string>({ label, options, value, onChange }: ChipGroupProps<T>) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
                selected ? 'border-brand-600 bg-brand-600' : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              }`}
            >
              <Text className={selected ? 'font-medium text-white' : 'text-neutral-700 dark:text-neutral-300'}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
