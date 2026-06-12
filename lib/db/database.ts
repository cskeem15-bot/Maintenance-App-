import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { SCHEMA_SQL } from './schema';

const DATABASE_NAME = 'upkeep.db';

let databasePromise: Promise<SQLiteDatabase> | undefined;

async function createDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  return db;
}

/** Returns the shared SQLite connection, opening and migrating it on first use. */
export function getDatabaseAsync(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }
  return databasePromise;
}

/** Test-only: drops the cached connection so the next call reopens the database. */
export function resetDatabaseForTests(): void {
  databasePromise = undefined;
}
