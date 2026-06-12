import { Stack } from 'expo-router';

import { useTaskReminders } from '@/lib/notifications/useTaskReminders';

export default function AppLayout() {
  useTaskReminders();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
