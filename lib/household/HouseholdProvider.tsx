import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { HouseholdRole } from '@/core/domain/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { supabase } from '@/lib/supabase/client';
import { runSync } from '@/lib/sync';

const HOUSEHOLD_STORAGE_PREFIX = 'upkeep:household:';

interface StoredHousehold {
  householdId: string;
  role: HouseholdRole;
}

interface HouseholdContextValue {
  /** The current user's primary household, or null until resolved (or if signed out). */
  householdId: string | null;
  role: HouseholdRole | null;
  /** True while the household membership is being resolved for the first time. */
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;
  /** Pushes queued local writes and pulls the latest household data from Supabase. */
  sync: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const db = useDatabase();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [role, setRole] = useState<HouseholdRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHouseholdId(null);
      setRole(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const userId = user.id;
    const storageKey = `${HOUSEHOLD_STORAGE_PREFIX}${userId}`;

    async function resolveHousehold() {
      setIsLoading(true);

      const cached = await AsyncStorage.getItem(storageKey);
      if (cached && !cancelled) {
        try {
          const parsed = JSON.parse(cached) as StoredHousehold;
          setHouseholdId(parsed.householdId);
          setRole(parsed.role);
        } catch {
          // Ignore malformed cache entries; fall through to the network lookup.
        }
      }

      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error && data) {
        const resolved: StoredHousehold = { householdId: data.household_id, role: data.role as HouseholdRole };
        setHouseholdId(resolved.householdId);
        setRole(resolved.role);
        await AsyncStorage.setItem(storageKey, JSON.stringify(resolved));
      }

      if (!cancelled) setIsLoading(false);
    }

    resolveHousehold();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sync = useCallback(async () => {
    if (!householdId) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await runSync(db, householdId);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [db, householdId]);

  useEffect(() => {
    if (householdId) {
      sync();
    }
  }, [householdId, sync]);

  return (
    <HouseholdContext.Provider value={{ householdId, role, isLoading, isSyncing, syncError, sync }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within a HouseholdProvider');
  return ctx;
}
