import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { DatabaseProvider } from '@/lib/db/DatabaseProvider';
import { HouseholdProvider } from '@/lib/household/HouseholdProvider';
import { useHasCompletedOnboarding } from '@/lib/household/useOnboardingStatus';
import { queryClient } from '@/lib/query/queryClient';

function RootNavigator() {
  const { session, isLoading: authLoading } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useHasCompletedOnboarding();

  if (authLoading || (!!session && onboardingLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !hasCompletedOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && hasCompletedOnboarding}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <AuthProvider>
              <HouseholdProvider>
                <RootNavigator />
              </HouseholdProvider>
            </AuthProvider>
          </DatabaseProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
