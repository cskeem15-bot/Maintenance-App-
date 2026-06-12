import { useQuery } from '@tanstack/react-query';

import { useDatabase } from '@/lib/db/DatabaseProvider';
import { listAssets } from '@/lib/db/repositories/assets';
import { queryKeys } from '@/lib/query/keys';
import { useHousehold } from './HouseholdProvider';

/**
 * Onboarding is considered complete once the household has at least one
 * asset. This is what decides whether the (onboarding) or (app) route group
 * is shown.
 */
export function useHasCompletedOnboarding(): { isLoading: boolean; hasCompletedOnboarding: boolean } {
  const db = useDatabase();
  const { householdId, isLoading: householdLoading } = useHousehold();

  const { data, isLoading: assetsLoading } = useQuery({
    queryKey: householdId ? queryKeys.assets(householdId) : queryKeys.assets('none'),
    queryFn: () => listAssets(db, householdId as string),
    enabled: !!householdId,
  });

  return {
    isLoading: householdLoading || (!!householdId && assetsLoading),
    hasCompletedOnboarding: (data?.length ?? 0) > 0,
  };
}
