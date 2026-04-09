-- ── AI & Payments migration ────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor on an existing database.
-- Creates: subscriptions, payments, ai_overview_usage tables with RLS.

drop table if exists ai_overview_usage cascade;
drop table if exists payments          cascade;
drop table if exists subscriptions     cascade;

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

alter table subscriptions      enable row level security;
alter table payments           enable row level security;
alter table ai_overview_usage  enable row level security;

create policy "Users own their subscriptions"
  on subscriptions for all using (auth.uid() = user_id);

create policy "Users own their payments"
  on payments for all using (auth.uid() = user_id);

create policy "Users own their AI usage"
  on ai_overview_usage for all using (auth.uid() = user_id);
