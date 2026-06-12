import type { SQLiteDatabase } from 'expo-sqlite';

import type { ServiceRecord } from '@/core/domain/types';
import { serviceRecordDomainToRow, serviceRecordRowToDomain, type ServiceRecordRow } from '../mappers';
import { enqueueOutbox } from '../outbox';

export async function listServiceRecordsForAsset(db: SQLiteDatabase, assetId: string): Promise<ServiceRecord[]> {
  const rows = await db.getAllAsync<ServiceRecordRow>(
    'select * from service_records where asset_id = ? order by completed_date desc',
    [assetId]
  );
  return rows.map(serviceRecordRowToDomain);
}

export async function listServiceRecordsForTask(db: SQLiteDatabase, taskId: string): Promise<ServiceRecord[]> {
  const rows = await db.getAllAsync<ServiceRecordRow>(
    'select * from service_records where task_id = ? order by completed_date desc',
    [taskId]
  );
  return rows.map(serviceRecordRowToDomain);
}

const UPSERT_SQL = `
  insert into service_records (
    id, task_id, asset_id, completed_date, completed_mileage, cost, vendor, notes, created_by, created_at
  )
  values (
    $id, $task_id, $asset_id, $completed_date, $completed_mileage, $cost, $vendor, $notes, $created_by, $created_at
  )
  on conflict(id) do update set
    completed_date = excluded.completed_date,
    completed_mileage = excluded.completed_mileage,
    cost = excluded.cost,
    vendor = excluded.vendor,
    notes = excluded.notes
`;

/** Writes a service record row to SQLite without touching the outbox (used when pulling from Supabase). */
export async function upsertServiceRecordLocal(db: SQLiteDatabase, row: ServiceRecordRow): Promise<void> {
  await db.runAsync(UPSERT_SQL, {
    $id: row.id,
    $task_id: row.task_id,
    $asset_id: row.asset_id,
    $completed_date: row.completed_date,
    $completed_mileage: row.completed_mileage,
    $cost: row.cost,
    $vendor: row.vendor,
    $notes: row.notes,
    $created_by: row.created_by,
    $created_at: row.created_at,
  });
}

/** Creates a service record locally and queues it to sync to Supabase. */
export async function saveServiceRecord(db: SQLiteDatabase, record: ServiceRecord, createdBy: string): Promise<void> {
  const row = serviceRecordDomainToRow(record, createdBy);
  await upsertServiceRecordLocal(db, row);
  await enqueueOutbox(db, { table: 'service_records', op: 'insert', recordId: record.id, payload: row });
}
