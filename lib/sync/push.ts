import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/lib/supabase/client';
import { listOutbox, removeOutboxEntry, type OutboxEntry } from '../db/outbox';

/**
 * Drains the local outbox in FIFO order, applying each queued write to
 * Supabase. Stops at the first failure (e.g. the device is offline) so
 * remaining entries stay queued for the next sync attempt.
 */
export async function pushOutbox(db: SQLiteDatabase): Promise<void> {
  const entries = await listOutbox(db);
  for (const entry of entries) {
    try {
      await applyOutboxEntry(entry);
      await removeOutboxEntry(db, entry.id);
    } catch (error) {
      console.warn(`Failed to sync ${entry.table_name} ${entry.op} for record ${entry.record_id}`, error);
      break;
    }
  }
}

async function applyOutboxEntry(entry: OutboxEntry): Promise<void> {
  const payload = JSON.parse(entry.payload) as Record<string, unknown>;

  // The outbox stores writes for many different tables, so the table name
  // (and therefore the row shape) is only known at runtime. The repository
  // layer that enqueued each entry is responsible for the row shape being
  // correct, so we intentionally drop typing here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as any).from(entry.table_name);

  if (entry.op === 'delete') {
    const { error } = await table.delete().eq('id', entry.record_id);
    if (error) throw error;
    return;
  }

  const { error } = await table.upsert(payload);
  if (error) throw error;
}
