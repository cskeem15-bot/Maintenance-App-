import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { setLastSyncedAt } from '../db/syncState';
import { upsertAssetLocal } from '../db/repositories/assets';
import { upsertHouseholdLocal, upsertHouseholdMemberLocal } from '../db/repositories/households';
import { upsertTaskLocal } from '../db/repositories/maintenanceTasks';
import { upsertProfileLocal } from '../db/repositories/profiles';
import { upsertServiceRecordLocal } from '../db/repositories/serviceRecords';
import type { AssetRow, HouseholdMemberRow, HouseholdRow, MaintenanceTaskRow, ProfileRow, ServiceRecordRow } from '../db/mappers';

type SupabaseAsset = Database['public']['Tables']['assets']['Row'];
type SupabaseTask = Database['public']['Tables']['maintenance_tasks']['Row'];
type SupabaseServiceRecord = Database['public']['Tables']['service_records']['Row'];
type SupabaseHousehold = Database['public']['Tables']['households']['Row'];
type SupabaseMember = Database['public']['Tables']['household_members']['Row'];
type SupabaseProfile = Database['public']['Tables']['profiles']['Row'];

function toAssetRow(row: SupabaseAsset): AssetRow {
  return { ...row, details: JSON.stringify(row.details) };
}

function toTaskRow(row: SupabaseTask): MaintenanceTaskRow {
  return { ...row, archived: row.archived ? 1 : 0 };
}

function toServiceRecordRow(row: SupabaseServiceRecord): ServiceRecordRow {
  return { ...row };
}

function toHouseholdRow(row: SupabaseHousehold): HouseholdRow {
  return { ...row };
}

function toMemberRow(row: SupabaseMember): HouseholdMemberRow {
  return { ...row };
}

function toProfileRow(row: SupabaseProfile): ProfileRow {
  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    timezone: row.timezone,
    notification_lead_time_minutes: row.notification_lead_time_minutes,
    quiet_hours_start: row.quiet_hours_start,
    quiet_hours_end: row.quiet_hours_end,
  };
}

/**
 * Pulls everything the offline UI needs for a household from Supabase and
 * upserts it into the local SQLite mirror: the household itself, its
 * members' profiles, assets, maintenance tasks, and service records.
 */
export async function pullHouseholdData(db: SQLiteDatabase, householdId: string): Promise<void> {
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();
  if (householdError) throw householdError;
  await upsertHouseholdLocal(db, toHouseholdRow(household));

  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId);
  if (membersError) throw membersError;
  for (const member of members ?? []) {
    await upsertHouseholdMemberLocal(db, toMemberRow(member));
  }

  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').in('id', memberIds);
    if (profilesError) throw profilesError;
    for (const profile of profiles ?? []) {
      await upsertProfileLocal(db, toProfileRow(profile), profile.updated_at);
    }
  }

  const { data: assets, error: assetsError } = await supabase.from('assets').select('*').eq('household_id', householdId);
  if (assetsError) throw assetsError;
  for (const asset of assets ?? []) {
    await upsertAssetLocal(db, toAssetRow(asset));
  }

  const assetIds = (assets ?? []).map((a) => a.id);
  if (assetIds.length > 0) {
    const { data: tasks, error: tasksError } = await supabase.from('maintenance_tasks').select('*').in('asset_id', assetIds);
    if (tasksError) throw tasksError;
    for (const task of tasks ?? []) {
      await upsertTaskLocal(db, toTaskRow(task));
    }

    const { data: records, error: recordsError } = await supabase
      .from('service_records')
      .select('*')
      .in('asset_id', assetIds);
    if (recordsError) throw recordsError;
    for (const record of records ?? []) {
      await upsertServiceRecordLocal(db, toServiceRecordRow(record));
    }
  }

  await setLastSyncedAt(db, `household:${householdId}`, new Date().toISOString());
}
