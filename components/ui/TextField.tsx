import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <TextInput
        className={`rounded-xl border bg-white px-4 py-3 text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 ${
          error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
        }`}
        placeholderTextColor="#9ca3af"
        accessibilityLabel={label}
        accessibilityState={{ disabled: props.editable === false }}
        {...props}
      />
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
