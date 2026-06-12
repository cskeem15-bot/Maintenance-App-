import { ActivityIndicator, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <ActivityIndicator size="large" color="#2563eb" accessibilityLabel="Loading" />
    </View>
  );
}
