import type { SQLiteDatabase } from 'expo-sqlite';

import type { MaintenanceTask } from '@/core/domain/types';
import { taskDomainToRow, taskRowToDomain, type MaintenanceTaskRow } from '../mappers';
import { enqueueOutbox } from '../outbox';

export async function listTasksForAsset(db: SQLiteDatabase, assetId: string): Promise<MaintenanceTask[]> {
  const rows = await db.getAllAsync<MaintenanceTaskRow>(
    'select * from maintenance_tasks where asset_id = ? and archived = 0 order by created_at asc',
    [assetId]
  );
  return rows.map(taskRowToDomain);
}

export async function listTasksForHousehold(db: SQLiteDatabase, householdId: string): Promise<MaintenanceTask[]> {
  const rows = await db.getAllAsync<MaintenanceTaskRow>(
    `select t.* from maintenance_tasks t
     join assets a on a.id = t.asset_id
     where a.household_id = ? and t.archived = 0
     order by t.created_at asc`,
    [householdId]
  );
  return rows.map(taskRowToDomain);
}

export async function getTask(db: SQLiteDatabase, id: string): Promise<MaintenanceTask | null> {
  const row = await db.getFirstAsync<MaintenanceTaskRow>('select * from maintenance_tasks where id = ?', [id]);
  return row ? taskRowToDomain(row) : null;
}

const UPSERT_SQL = `
  insert into maintenance_tasks (
    id, asset_id, title, category, trigger_type, interval_months, interval_miles,
    last_completed_date, last_completed_mileage, due_soon_threshold_days,
    due_soon_threshold_miles, priority, assigned_member_id, notes, part_number,
    archived, created_at, updated_at
  )
  values (
    $id, $asset_id, $title, $category, $trigger_type, $interval_months, $interval_miles,
    $last_completed_date, $last_completed_mileage, $due_soon_threshold_days,
    $due_soon_threshold_miles, $priority, $assigned_member_id, $notes, $part_number,
    $archived, $created_at, $updated_at
  )
  on conflict(id) do update set
    asset_id = excluded.asset_id,
    title = excluded.title,
    category = excluded.category,
    trigger_type = excluded.trigger_type,
    interval_months = excluded.interval_months,
    interval_miles = excluded.interval_miles,
    last_completed_date = excluded.last_completed_date,
    last_completed_mileage = excluded.last_completed_mileage,
    due_soon_threshold_days = excluded.due_soon_threshold_days,
    due_soon_threshold_miles = excluded.due_soon_threshold_miles,
    priority = excluded.priority,
    assigned_member_id = excluded.assigned_member_id,
    notes = excluded.notes,
    part_number = excluded.part_number,
    archived = excluded.archived,
    updated_at = excluded.updated_at
`;

/** Writes a task row to SQLite without touching the outbox (used when pulling from Supabase). */
export async function upsertTaskLocal(db: SQLiteDatabase, row: MaintenanceTaskRow): Promise<void> {
  await db.runAsync(UPSERT_SQL, {
    $id: row.id,
    $asset_id: row.asset_id,
    $title: row.title,
    $category: row.category,
    $trigger_type: row.trigger_type,
    $interval_months: row.interval_months,
    $interval_miles: row.interval_miles,
    $last_completed_date: row.last_completed_date,
    $last_completed_mileage: row.last_completed_mileage,
    $due_soon_threshold_days: row.due_soon_threshold_days,
    $due_soon_threshold_miles: row.due_soon_threshold_miles,
    $priority: row.priority,
    $assigned_member_id: row.assigned_member_id,
    $notes: row.notes,
    $part_number: row.part_number,
    $archived: row.archived,
    $created_at: row.created_at,
    $updated_at: row.updated_at,
  });
}

/** Creates or updates a task locally and queues the change to sync to Supabase. */
export async function saveTask(db: SQLiteDatabase, task: MaintenanceTask, op: 'insert' | 'update' = 'update'): Promise<void> {
  const row = taskDomainToRow(task);
  await upsertTaskLocal(db, row);
  await enqueueOutbox(db, { table: 'maintenance_tasks', op, recordId: task.id, payload: row });
}

export async function deleteTask(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('delete from maintenance_tasks where id = ?', [id]);
  await enqueueOutbox(db, { table: 'maintenance_tasks', op: 'delete', recordId: id, payload: { id } });
}
