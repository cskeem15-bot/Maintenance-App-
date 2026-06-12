import type { SQLiteDatabase } from 'expo-sqlite';

import { pullHouseholdData } from './pull';
import { pushOutbox } from './push';

export { pullHouseholdData } from './pull';
export { pushOutbox } from './push';

/**
 * Pushes any queued local writes, then pulls the latest household data from
 * Supabase. Call this on app start, on reconnect, and after mutations.
 */
export async function runSync(db: SQLiteDatabase, householdId: string): Promise<void> {
  await pushOutbox(db);
  await pullHouseholdData(db, householdId);
}
