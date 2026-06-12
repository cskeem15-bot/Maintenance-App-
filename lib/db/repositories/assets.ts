import type { SQLiteDatabase } from 'expo-sqlite';

import type { Asset } from '@/core/domain/types';
import { assetDomainToRow, assetRowToDomain, type AssetRow } from '../mappers';
import { enqueueOutbox } from '../outbox';

export async function listAssets(db: SQLiteDatabase, householdId: string): Promise<Asset[]> {
  const rows = await db.getAllAsync<AssetRow>('select * from assets where household_id = ? order by created_at asc', [
    householdId,
  ]);
  return rows.map(assetRowToDomain);
}

export async function getAsset(db: SQLiteDatabase, id: string): Promise<Asset | null> {
  const row = await db.getFirstAsync<AssetRow>('select * from assets where id = ?', [id]);
  return row ? assetRowToDomain(row) : null;
}

const UPSERT_SQL = `
  insert into assets (id, household_id, type, name, details, created_by, created_at, updated_at)
  values ($id, $household_id, $type, $name, $details, $created_by, $created_at, $updated_at)
  on conflict(id) do update set
    household_id = excluded.household_id,
    type = excluded.type,
    name = excluded.name,
    details = excluded.details,
    created_by = excluded.created_by,
    updated_at = excluded.updated_at
`;

/** Writes an asset row to SQLite without touching the outbox (used when pulling from Supabase). */
export async function upsertAssetLocal(db: SQLiteDatabase, row: AssetRow): Promise<void> {
  await db.runAsync(UPSERT_SQL, {
    $id: row.id,
    $household_id: row.household_id,
    $type: row.type,
    $name: row.name,
    $details: row.details,
    $created_by: row.created_by,
    $created_at: row.created_at,
    $updated_at: row.updated_at,
  });
}

/** Creates or updates an asset locally and queues the change to sync to Supabase. */
export async function saveAsset(
  db: SQLiteDatabase,
  asset: Asset,
  householdId: string,
  createdBy: string,
  op: 'insert' | 'update' = 'update'
): Promise<void> {
  const row = assetDomainToRow(asset, householdId, createdBy);
  await upsertAssetLocal(db, row);
  await enqueueOutbox(db, { table: 'assets', op, recordId: asset.id, payload: row });
}

export async function deleteAsset(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('delete from assets where id = ?', [id]);
  await enqueueOutbox(db, { table: 'assets', op: 'delete', recordId: id, payload: { id } });
}
