import type { SQLiteDatabase } from 'expo-sqlite';

import type { Household, HouseholdMembership } from '@/core/domain/types';
import {
  householdMemberRowToDomain,
  householdRowToDomain,
  type HouseholdMemberRow,
  type HouseholdRow,
} from '../mappers';

export async function listHouseholds(db: SQLiteDatabase): Promise<Household[]> {
  const rows = await db.getAllAsync<HouseholdRow>('select * from households order by created_at asc');
  return rows.map(householdRowToDomain);
}

export async function getHousehold(db: SQLiteDatabase, id: string): Promise<Household | null> {
  const row = await db.getFirstAsync<HouseholdRow>('select * from households where id = ?', [id]);
  return row ? householdRowToDomain(row) : null;
}

const UPSERT_HOUSEHOLD_SQL = `
  insert into households (id, name, created_by, created_at, updated_at)
  values ($id, $name, $created_by, $created_at, $updated_at)
  on conflict(id) do update set
    name = excluded.name,
    updated_at = excluded.updated_at
`;

export async function upsertHouseholdLocal(db: SQLiteDatabase, row: HouseholdRow): Promise<void> {
  await db.runAsync(UPSERT_HOUSEHOLD_SQL, {
    $id: row.id,
    $name: row.name,
    $created_by: row.created_by,
    $created_at: row.created_at,
    $updated_at: row.updated_at,
  });
}

export async function listHouseholdMembers(db: SQLiteDatabase, householdId: string): Promise<HouseholdMembership[]> {
  const rows = await db.getAllAsync<HouseholdMemberRow>('select * from household_members where household_id = ?', [
    householdId,
  ]);
  return rows.map(householdMemberRowToDomain);
}

const UPSERT_MEMBER_SQL = `
  insert into household_members (household_id, user_id, role, created_at)
  values ($household_id, $user_id, $role, $created_at)
  on conflict(household_id, user_id) do update set role = excluded.role
`;

export async function upsertHouseholdMemberLocal(db: SQLiteDatabase, row: HouseholdMemberRow): Promise<void> {
  await db.runAsync(UPSERT_MEMBER_SQL, {
    $household_id: row.household_id,
    $user_id: row.user_id,
    $role: row.role,
    $created_at: row.created_at,
  });
}
