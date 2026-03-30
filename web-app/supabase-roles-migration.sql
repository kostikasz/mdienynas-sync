-- ── user_roles migration ──────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor.
-- Creates a user_roles table (editable in Table Editor) and a trigger that
-- automatically syncs it to auth.users.raw_app_meta_data so the app_metadata
-- roles[] array is always up to date.
-- ─────────────────────────────────────────────────────────────────────────────

-- Tear down in case you need to re-run
-- DROP TRIGGER requires the table to exist even with IF EXISTS, so guard it
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_roles'
  ) then
    drop trigger if exists sync_roles_after_change on public.user_roles;
  end if;
end $$;
drop function if exists public.sync_user_roles();
drop table    if exists public.user_roles cascade;
drop type     if exists public.app_role cascade;

-- ── Role enum ────────────────────────────────────────────────────────────────
create type public.app_role as enum ('ADMIN', 'CLOUD');

-- ── Table ─────────────────────────────────────────────────────────────────────
create table public.user_roles (
  id      bigint generated always as identity primary key,
  user_id uuid           not null references auth.users(id) on delete cascade,
  role    public.app_role not null,
  unique (user_id, role)
);

-- RLS: only the service role (admin API) and users with ADMIN role may read
alter table public.user_roles enable row level security;

create policy "service role full access"
  on public.user_roles
  using (true)
  with check (true);

-- ── Trigger: sync user_roles → app_metadata ───────────────────────────────────
create or replace function public.sync_user_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _roles   text[];
begin
  if tg_op = 'DELETE' then
    _user_id := old.user_id;
  else
    _user_id := new.user_id;
  end if;

  select coalesce(array_agg(role::text order by role), array[]::text[])
  into   _roles
  from   public.user_roles
  where  user_id = _user_id;

  update auth.users
  set    raw_app_meta_data =
           coalesce(raw_app_meta_data, '{}'::jsonb)
           || jsonb_build_object('roles', to_jsonb(_roles))
  where  id = _user_id;

  return null;
end;
$$;

create trigger sync_roles_after_change
after insert or update or delete on public.user_roles
for each row execute function public.sync_user_roles();
