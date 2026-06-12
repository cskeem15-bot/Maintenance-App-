-- =========================================================================
-- Documents (warranties, manuals, receipts, etc.)
--
-- Files themselves live in the 'documents' Storage bucket under the path
-- convention {household_id}/{filename}; this table holds the metadata and
-- optional links back to the asset/service record they relate to.
-- =========================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  asset_id uuid references public.assets (id) on delete cascade,
  service_record_id uuid references public.service_records (id) on delete cascade,
  type text not null default 'other' check (type in ('warranty', 'manual', 'insurance', 'receipt', 'other')),
  title text not null,
  storage_path text not null,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index documents_household_id_idx on public.documents (household_id);
create index documents_asset_id_idx on public.documents (asset_id);

-- =========================================================================
-- Notification schedules
--
-- Rows are created/managed server-side (Edge Functions using the service
-- role) based on each task's due date/mileage and the user's
-- notification_lead_time_minutes + quiet hours. Regular users can only
-- read their own rows and update them for snooze/mark-done actions.
-- =========================================================================

create table public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.maintenance_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('reminder', 'due', 'overdue')),
  scheduled_for timestamptz not null,
  lead_time_minutes integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'sent', 'snoozed', 'cancelled', 'completed')),
  snooze_until timestamptz,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_schedules_user_id_idx on public.notification_schedules (user_id);
create index notification_schedules_pending_idx
  on public.notification_schedules (scheduled_for)
  where status = 'pending';

create trigger notification_schedules_set_updated_at
  before update on public.notification_schedules
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.documents enable row level security;
alter table public.notification_schedules enable row level security;

-- Documents: visibility/mutation mirror household membership. Members,
-- admins and owners can upload; the uploader or an admin/owner can delete.
create policy "Members can view documents"
  on public.documents for select
  using (public.is_household_member(household_id));

create policy "Members can upload documents"
  on public.documents for insert
  with check (
    public.household_role(household_id) in ('owner', 'admin', 'member')
    and uploaded_by = auth.uid()
  );

create policy "Uploaders and admins can delete documents"
  on public.documents for delete
  using (
    uploaded_by = auth.uid()
    or public.household_role(household_id) in ('owner', 'admin')
  );

-- Notification schedules: a user can only ever see/update their own
-- notifications (e.g. to snooze or mark done from a push action). Rows are
-- created and removed by server-side Edge Functions using the service role,
-- which bypasses RLS, so no insert/delete policy is defined here.
create policy "Users can view their own notification schedules"
  on public.notification_schedules for select
  using (user_id = auth.uid());

create policy "Users can update their own notification schedules"
  on public.notification_schedules for update
  using (user_id = auth.uid());

-- =========================================================================
-- Storage: 'documents' bucket
--
-- Objects are stored under the path {household_id}/{asset_id-or-misc}/{filename}
-- so policies can check household membership via the first path segment.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Members can view household documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );

create policy "Members can upload household documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.household_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'member')
  );

create policy "Members can update household documents"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and public.household_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'member')
  );

create policy "Owners and admins can delete household documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.household_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );
