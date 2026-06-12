import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (use for forms/long content). */
  scroll?: boolean;
  /** Apply the standard horizontal/vertical padding. Disable for screens that manage their own (e.g. lists). */
  padded?: boolean;
  className?: string;
}

/** Common screen container: safe-area aware, with consistent horizontal padding. */
export function Screen({ children, scroll = false, padded = true, className = '' }: ScreenProps) {
  const padding = padded ? 'px-6 py-6' : '';

  if (scroll) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <ScrollView className="flex-1" contentContainerClassName={`${padding} ${className}`} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className={`flex-1 ${padding} ${className}`}>{children}</View>
    </SafeAreaView>
  );
}
