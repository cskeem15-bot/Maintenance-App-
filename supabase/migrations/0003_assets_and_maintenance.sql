-- =========================================================================
-- Assets (vehicles & properties)
-- =========================================================================

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  type text not null check (type in ('vehicle', 'property')),
  name text not null,
  -- Polymorphic details payload: VehicleDetails or PropertyDetails (see core/domain/types.ts)
  details jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_household_id_idx on public.assets (household_id);

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- RLS helper: resolve the household an asset belongs to.
--
-- SECURITY DEFINER + a fixed search_path so this can be used inside RLS
-- policies on tables that only reference assets (not households directly).
-- =========================================================================

create or replace function public.asset_household_id(target_asset_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.assets where id = target_asset_id;
$$;

-- =========================================================================
-- Maintenance tasks
-- =========================================================================

create table public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  title text not null,
  category text not null default 'general',
  trigger_type text not null check (trigger_type in ('time', 'mileage', 'time_or_mileage')),
  interval_months integer,
  interval_miles integer,
  last_completed_date date not null,
  last_completed_mileage integer,
  due_soon_threshold_days integer not null default 14,
  due_soon_threshold_miles integer not null default 500,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_member_id uuid references auth.users (id),
  notes text,
  part_number text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_tasks_interval_matches_trigger check (
    (trigger_type = 'time' and interval_months is not null)
    or (trigger_type = 'mileage' and interval_miles is not null)
    or (trigger_type = 'time_or_mileage' and interval_months is not null and interval_miles is not null)
  )
);

create index maintenance_tasks_asset_id_idx on public.maintenance_tasks (asset_id);

create trigger maintenance_tasks_set_updated_at
  before update on public.maintenance_tasks
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- Service records
-- =========================================================================

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.maintenance_tasks (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  completed_date date not null,
  completed_mileage integer,
  cost numeric(10, 2),
  vendor text,
  notes text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index service_records_asset_id_idx on public.service_records (asset_id);
create index service_records_task_id_idx on public.service_records (task_id);

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.assets enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.service_records enable row level security;

-- Assets: any household member can view. Members/admins/owners (not
-- viewers) can create and edit. Only owners/admins can delete.
create policy "Members can view their household's assets"
  on public.assets for select
  using (public.is_household_member(household_id));

create policy "Members can create assets"
  on public.assets for insert
  with check (
    public.household_role(household_id) in ('owner', 'admin', 'member')
    and created_by = auth.uid()
  );

create policy "Members can update assets"
  on public.assets for update
  using (public.household_role(household_id) in ('owner', 'admin', 'member'));

create policy "Owners and admins can delete assets"
  on public.assets for delete
  using (public.household_role(household_id) in ('owner', 'admin'));

-- Maintenance tasks: visibility/mutation mirror the parent asset's household
-- permissions, resolved via asset_household_id().
create policy "Members can view maintenance tasks"
  on public.maintenance_tasks for select
  using (public.is_household_member(public.asset_household_id(asset_id)));

create policy "Members can create maintenance tasks"
  on public.maintenance_tasks for insert
  with check (
    public.household_role(public.asset_household_id(asset_id)) in ('owner', 'admin', 'member')
  );

create policy "Members can update maintenance tasks"
  on public.maintenance_tasks for update
  using (
    public.household_role(public.asset_household_id(asset_id)) in ('owner', 'admin', 'member')
  );

create policy "Owners and admins can delete maintenance tasks"
  on public.maintenance_tasks for delete
  using (
    public.household_role(public.asset_household_id(asset_id)) in ('owner', 'admin')
  );

-- Service records: visibility mirrors the parent asset's household.
-- Members/admins/owners can log records they create; the creator or an
-- admin/owner can edit/delete.
create policy "Members can view service records"
  on public.service_records for select
  using (public.is_household_member(public.asset_household_id(asset_id)));

create policy "Members can create service records"
  on public.service_records for insert
  with check (
    public.household_role(public.asset_household_id(asset_id)) in ('owner', 'admin', 'member')
    and created_by = auth.uid()
  );

create policy "Creators and admins can update service records"
  on public.service_records for update
  using (
    created_by = auth.uid()
    or public.household_role(public.asset_household_id(asset_id)) in ('owner', 'admin')
  );

create policy "Owners and admins can delete service records"
  on public.service_records for delete
  using (
    public.household_role(public.asset_household_id(asset_id)) in ('owner', 'admin')
  );
