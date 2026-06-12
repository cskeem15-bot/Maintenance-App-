// Local SQLite mirror of the Supabase schema (see supabase/migrations/).
// Only the columns the app reads/writes offline are included. Booleans are
// stored as 0/1 and JSON payloads as TEXT, per SQLite conventions.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
create table if not exists households (
  id text primary key,
  name text not null,
  created_by text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists household_members (
  household_id text not null,
  user_id text not null,
  role text not null,
  created_at text not null,
  primary key (household_id, user_id)
);

create table if not exists profiles (
  id text primary key,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  notification_lead_time_minutes integer not null default 1440,
  quiet_hours_start text,
  quiet_hours_end text,
  updated_at text not null
);

create table if not exists assets (
  id text primary key,
  household_id text not null,
  type text not null,
  name text not null,
  details text not null default '{}',
  created_by text not null,
  created_at text not null,
  updated_at text not null
);
create index if not exists assets_household_id_idx on assets (household_id);

create table if not exists maintenance_tasks (
  id text primary key,
  asset_id text not null,
  title text not null,
  category text not null default 'general',
  trigger_type text not null,
  interval_months integer,
  interval_miles integer,
  last_completed_date text not null,
  last_completed_mileage integer,
  due_soon_threshold_days integer not null default 14,
  due_soon_threshold_miles integer not null default 500,
  priority text not null default 'medium',
  assigned_member_id text,
  notes text,
  part_number text,
  archived integer not null default 0,
  created_at text not null,
  updated_at text not null
);
create index if not exists maintenance_tasks_asset_id_idx on maintenance_tasks (asset_id);

create table if not exists service_records (
  id text primary key,
  task_id text not null,
  asset_id text not null,
  completed_date text not null,
  completed_mileage integer,
  cost real,
  vendor text,
  notes text,
  created_by text not null,
  created_at text not null
);
create index if not exists service_records_asset_id_idx on service_records (asset_id);
create index if not exists service_records_task_id_idx on service_records (task_id);

-- Queue of local writes that haven't been pushed to Supabase yet. Drained by
-- lib/sync in FIFO order whenever the app is online.
create table if not exists outbox (
  id integer primary key autoincrement,
  table_name text not null,
  op text not null check (op in ('insert', 'update', 'delete')),
  record_id text not null,
  payload text not null,
  created_at text not null
);

-- Tracks the last time each table was successfully pulled from Supabase, so
-- incremental syncs can request only rows updated since then.
create table if not exists sync_state (
  table_name text primary key,
  last_synced_at text
);
`;
