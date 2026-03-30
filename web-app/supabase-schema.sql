-- Mano Dienynas — Supabase schema
-- Run this in the Supabase SQL editor to set up the database.
-- Safe to re-run: drops existing tables (and their policies/indexes) before recreating.

-- ── Teardown (reverse dependency order) ──────────────────────────────────────
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_roles'
  ) then
    drop trigger if exists sync_roles_after_change on public.user_roles;
  end if;
end $$;
drop function if exists public.sync_user_roles();
drop table if exists ai_overview_usage  cascade;
drop table if exists payments           cascade;
drop table if exists subscriptions      cascade;
drop table if exists passkeys           cascade;
drop table if exists integrations       cascade;
drop table if exists homework_snapshots cascade;
drop table if exists courses            cascade;
drop table if exists grades_snapshots   cascade;
drop table if exists user_roles         cascade;
drop type  if exists public.app_role    cascade;

-- ── Role management ──────────────────────────────────────────────────────────

create type public.app_role as enum ('ADMIN', 'CLOUD');

create table public.user_roles (
  id      bigint generated always as identity primary key,
  user_id uuid            not null references auth.users(id) on delete cascade,
  role    public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Service role (used by admin API) bypasses RLS automatically.
-- This policy lets logged-in admins read the table in the dashboard.
create policy "service role full access"
  on public.user_roles using (true) with check (true);

-- Trigger: keep auth.users.raw_app_meta_data in sync with user_roles
create or replace function public.sync_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _user_id uuid;
  _roles   text[];
begin
  if tg_op = 'DELETE' then _user_id := old.user_id; else _user_id := new.user_id; end if;
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

-- ── Tables ────────────────────────────────────────────────────────────────────

create table grades_snapshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  scraped_at timestamptz not null,
  term       text,
  raw_json   jsonb not null,
  created_at timestamptz default now()
);

create table courses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  snapshot_id        uuid references grades_snapshots(id) on delete cascade,
  course_code        text,
  name               text,
  instructor         text,
  credits            int,
  current_grade      text,
  current_percentage float,
  term               text
);

create table homework_snapshots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  generated_at timestamptz not null,
  source       text,
  raw_json     jsonb not null,
  created_at   timestamptz default now()
);

create table integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  provider       text not null,
  access_token   text,
  refresh_token  text,
  metadata       jsonb,
  connected_at   timestamptz,
  last_synced_at timestamptz,
  unique(user_id, provider)
);

-- Passkeys for FIDO2/WebAuthn passwordless sign-in
-- credential_id is the base64url-encoded credential ID from the authenticator
create table passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  user_email    text not null,
  credential_id text not null unique,
  public_key    text not null,       -- COSE public key, base64url-encoded
  counter       bigint not null default 0,
  device_type   text,                -- 'singleDevice' | 'multiDevice'
  backed_up     boolean default false,
  transports    text[],              -- ['usb', 'nfc', 'ble', 'internal', ...]
  friendly_name text,
  created_at    timestamptz default now()
);

create index passkeys_user_id_idx    on passkeys (user_id);
create index passkeys_user_email_idx on passkeys (user_email);

create table subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  plan         text not null default 'free',  -- 'free' | 'pro'
  status       text not null default 'active', -- 'active' | 'cancelled' | 'expired'
  started_at   timestamptz default now(),
  expires_at   timestamptz,                   -- null = no expiry for active
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  subscription_id  uuid references subscriptions(id) on delete set null,
  provider         text not null default 'paysera',
  provider_order_id text,                    -- Paysera order ID
  amount_cents     integer not null,          -- in EUR cents
  currency         text not null default 'EUR',
  status           text not null default 'pending',  -- 'pending' | 'paid' | 'failed' | 'refunded'
  metadata         jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index payments_user_id_idx on payments (user_id);
create index payments_provider_order_id_idx on payments (provider_order_id);

create table ai_overview_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  used_at      timestamptz default now(),
  tokens_used  integer,
  model        text
);
create index ai_overview_usage_user_id_idx on ai_overview_usage (user_id);
create index ai_overview_usage_used_at_idx on ai_overview_usage (used_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table grades_snapshots    enable row level security;
alter table courses             enable row level security;
alter table homework_snapshots  enable row level security;
alter table integrations        enable row level security;
alter table passkeys            enable row level security;

create policy "Users own their snapshots"
  on grades_snapshots for all using (auth.uid() = user_id);

create policy "Users own their courses"
  on courses for all using (auth.uid() = user_id);

create policy "Users own their homework"
  on homework_snapshots for all using (auth.uid() = user_id);

create policy "Users own their integrations"
  on integrations for all using (auth.uid() = user_id);

create policy "Users own their passkeys"
  on passkeys for all using (auth.uid() = user_id);

alter table subscriptions      enable row level security;
alter table payments           enable row level security;
alter table ai_overview_usage  enable row level security;

create policy "Users own their subscriptions"
  on subscriptions for all using (auth.uid() = user_id);

create policy "Users own their payments"
  on payments for all using (auth.uid() = user_id);

create policy "Users own their AI usage"
  on ai_overview_usage for all using (auth.uid() = user_id);
