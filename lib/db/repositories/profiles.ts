import type { SQLiteDatabase } from 'expo-sqlite';

import type { Profile } from '@/core/domain/types';
import { profileDomainToRow, profileRowToDomain, type ProfileRow } from '../mappers';
import { enqueueOutbox } from '../outbox';

export async function listProfiles(db: SQLiteDatabase, ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ProfileRow>(`select * from profiles where id in (${placeholders})`, ids);
  return rows.map(profileRowToDomain);
}

export async function getProfile(db: SQLiteDatabase, id: string): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>('select * from profiles where id = ?', [id]);
  return row ? profileRowToDomain(row) : null;
}

const UPSERT_SQL = `
  insert into profiles (
    id, display_name, avatar_url, timezone, notification_lead_time_minutes,
    quiet_hours_start, quiet_hours_end, updated_at
  )
  values ($id, $display_name, $avatar_url, $timezone, $notification_lead_time_minutes, $quiet_hours_start, $quiet_hours_end, $updated_at)
  on conflict(id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    timezone = excluded.timezone,
    notification_lead_time_minutes = excluded.notification_lead_time_minutes,
    quiet_hours_start = excluded.quiet_hours_start,
    quiet_hours_end = excluded.quiet_hours_end,
    updated_at = excluded.updated_at
`;

/** Writes a profile row to SQLite without touching the outbox (used when pulling from Supabase). */
export async function upsertProfileLocal(db: SQLiteDatabase, row: ProfileRow, updatedAt: string): Promise<void> {
  await db.runAsync(UPSERT_SQL, {
    $id: row.id,
    $display_name: row.display_name,
    $avatar_url: row.avatar_url,
    $timezone: row.timezone,
    $notification_lead_time_minutes: row.notification_lead_time_minutes,
    $quiet_hours_start: row.quiet_hours_start,
    $quiet_hours_end: row.quiet_hours_end,
    $updated_at: updatedAt,
  });
}

/** Updates the current user's profile locally and queues the change to sync to Supabase. */
export async function saveProfile(db: SQLiteDatabase, profile: Profile): Promise<void> {
  const row = profileDomainToRow(profile);
  await upsertProfileLocal(db, row, new Date().toISOString());
  await enqueueOutbox(db, { table: 'profiles', op: 'update', recordId: profile.id, payload: row });
}
