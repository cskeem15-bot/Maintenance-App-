import type { SQLiteDatabase } from 'expo-sqlite';

export async function getLastSyncedAt(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ last_synced_at: string | null }>(
    'select last_synced_at from sync_state where table_name = ?',
    [key]
  );
  return row?.last_synced_at ?? null;
}

export async function setLastSyncedAt(db: SQLiteDatabase, key: string, timestamp: string): Promise<void> {
  await db.runAsync(
    `insert into sync_state (table_name, last_synced_at) values (?, ?)
     on conflict(table_name) do update set last_synced_at = excluded.last_synced_at`,
    [key, timestamp]
  );
}
