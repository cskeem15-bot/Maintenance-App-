-- Extensions
create extension if not exists "pgcrypto" with schema extensions;

-- Generic "touch updated_at" trigger used by most tables below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
