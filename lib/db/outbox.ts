import type { SQLiteDatabase } from 'expo-sqlite';

export type OutboxOp = 'insert' | 'update' | 'delete';

export interface OutboxEntry {
  id: number;
  table_name: string;
  op: OutboxOp;
  record_id: string;
  payload: string;
  created_at: string;
}

export interface EnqueueOutboxInput {
  table: string;
  op: OutboxOp;
  recordId: string;
  payload: unknown;
}

/** Queues a local write to be pushed to Supabase the next time lib/sync runs. */
export async function enqueueOutbox(db: SQLiteDatabase, entry: EnqueueOutboxInput): Promise<void> {
  await db.runAsync('insert into outbox (table_name, op, record_id, payload, created_at) values (?, ?, ?, ?, ?)', [
    entry.table,
    entry.op,
    entry.recordId,
    JSON.stringify(entry.payload),
    new Date().toISOString(),
  ]);
}

export async function listOutbox(db: SQLiteDatabase): Promise<OutboxEntry[]> {
  return db.getAllAsync<OutboxEntry>('select * from outbox order by id asc');
}

export async function removeOutboxEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('delete from outbox where id = ?', [id]);
}
