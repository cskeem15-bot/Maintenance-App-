import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

const CONTAINER_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-neutral-100 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700',
  destructive: 'bg-red-600 active:bg-red-700',
  ghost: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-900',
};

const TEXT_STYLES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-900 dark:text-neutral-100',
  destructive: 'text-white',
  ghost: 'text-brand-600 dark:text-brand-400',
};

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: '#ffffff',
  secondary: '#2563eb',
  destructive: '#ffffff',
  ghost: '#2563eb',
};

export function Button({ label, variant = 'primary', loading = false, disabled = false, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-xl px-4 py-3.5 ${CONTAINER_STYLES[variant]} ${
        isDisabled ? 'opacity-50' : ''
      }`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : (
        <Text className={`text-base font-semibold ${TEXT_STYLES[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
