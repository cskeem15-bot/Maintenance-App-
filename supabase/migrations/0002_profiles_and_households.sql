-- =========================================================================
-- Profiles
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  -- How many minutes before a task is due to send the first reminder.
  notification_lead_time_minutes integer not null default 1440,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- Households & membership
-- =========================================================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger households_set_updated_at
  before update on public.households
  for each row execute procedure public.set_updated_at();

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_id_idx on public.household_members (user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references auth.users (id),
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index household_invites_household_id_idx on public.household_invites (household_id);
create unique index household_invites_token_idx on public.household_invites (token);

-- =========================================================================
-- RLS helper functions
--
-- SECURITY DEFINER + a fixed search_path lets these run as the table owner
-- (which has BYPASSRLS in Supabase), so they can be used inside policies on
-- household_members itself without recursive RLS evaluation.
-- =========================================================================

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.household_role(target_household_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.household_members
  where household_id = target_household_id
    and user_id = auth.uid()
  limit 1;
$$;

-- =========================================================================
-- New-user bootstrap: every signed-up user gets a profile and a personal
-- household with themselves as owner, so onboarding never has to ask
-- "create a household first".
-- =========================================================================

create or replace function public.handle_new_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_household_created
  after insert on public.households
  for each row execute procedure public.handle_new_household();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );

  insert into public.households (name, created_by)
  values ('My Household', new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

-- Profiles: a user can always see/update their own profile, and can see
-- profiles of anyone who shares a household with them (e.g. to render
-- "assigned to" names).
create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Household members can view each other's profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.user_id = profiles.id
        and public.is_household_member(hm.household_id)
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Households: members can view; only the owner can rename/delete. Creating
-- additional households is allowed for any authenticated user (the
-- on_household_created trigger adds them as owner).
create policy "Members can view their households"
  on public.households for select
  using (public.is_household_member(id));

create policy "Authenticated users can create households"
  on public.households for insert
  with check (created_by = auth.uid());

create policy "Owners can update their household"
  on public.households for update
  using (public.household_role(id) = 'owner');

create policy "Owners can delete their household"
  on public.households for delete
  using (public.household_role(id) = 'owner');

-- Household members: visible to anyone in the household. Mutation is
-- restricted to owners/admins (used by invite-acceptance flows in Phase 2).
create policy "Members can view their household's roster"
  on public.household_members for select
  using (public.is_household_member(household_id));

create policy "Owners and admins can manage membership rows"
  on public.household_members for all
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin'));

-- Household invites: only owners/admins can see and manage invites for
-- their household.
create policy "Owners and admins can view invites"
  on public.household_invites for select
  using (public.household_role(household_id) in ('owner', 'admin'));

create policy "Owners and admins can create invites"
  on public.household_invites for insert
  with check (
    public.household_role(household_id) in ('owner', 'admin')
    and invited_by = auth.uid()
  );

create policy "Owners and admins can update invites"
  on public.household_invites for update
  using (public.household_role(household_id) in ('owner', 'admin'));
