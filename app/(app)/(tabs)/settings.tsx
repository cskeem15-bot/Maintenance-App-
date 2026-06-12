import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { getHousehold } from '@/lib/db/repositories/households';
import { getProfile } from '@/lib/db/repositories/profiles';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { queryKeys } from '@/lib/query/keys';

export default function SettingsScreen() {
  const db = useDatabase();
  const { user, signOut } = useAuth();
  const { householdId, role } = useHousehold();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(user?.id ?? 'none'),
    queryFn: () => getProfile(db, user?.id as string),
    enabled: !!user,
  });

  const householdQuery = useQuery({
    queryKey: queryKeys.household(householdId ?? 'none'),
    queryFn: () => getHousehold(db, householdId as string),
    enabled: !!householdId,
  });

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Best-effort; if it fails the session simply remains active.
    }
  }

  return (
    <Screen>
      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Settings</Text>

      <View className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Account</Text>
        <Text className="mt-2 text-base font-medium text-neutral-900 dark:text-white">
          {profileQuery.data?.displayName || 'Your profile'}
        </Text>
        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</Text>
      </View>

      <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Household</Text>
        <Text className="mt-2 text-base font-medium text-neutral-900 dark:text-white">{householdQuery.data?.name ?? '—'}</Text>
        {role ? (
          <Text className="mt-0.5 text-sm capitalize text-neutral-500 dark:text-neutral-400">Your role: {role}</Text>
        ) : null}
      </View>

      <View className="mt-8">
        <Button label="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
    </Screen>
  );
}
