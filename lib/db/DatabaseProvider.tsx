import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getDatabaseAsync } from './database';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

/** Opens the local SQLite database and makes it available to descendants via useDatabase(). */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDatabaseAsync().then((database) => {
      if (!cancelled) setDb(database);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!db) return <LoadingScreen />;

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within a DatabaseProvider');
  return db;
}
