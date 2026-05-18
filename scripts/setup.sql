-- NPB DocSign — Supabase Setup Script
-- Run this in: Supabase Dashboard → SQL Editor → New Query

create extension if not exists "pgcrypto";

-- ── clients ──────────────────────────────────────────────────
create table if not exists clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  phone      text,
  created_at timestamptz default now()
);

-- ── documents ─────────────────────────────────────────────────
create table if not exists documents (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('SALES_LEGAL','ACCOUNTS','HR')),
  status           text not null default 'draft'
                     check (status in ('draft','sent','viewed','signed')),
  client_id        uuid references clients(id) on delete set null,
  client_name      text not null,
  client_email     text not null,
  client_company   text,
  fields           jsonb not null default '{}',
  signing_token    text unique default encode(gen_random_bytes(32),'hex'),
  signed_at        timestamptz,
  signed_pdf_url   text,
  nbg_signature    text,
  client_signature text,
  created_by       uuid,
  created_at       timestamptz default now(),
  sent_at          timestamptz,
  expires_at       timestamptz default (now() + interval '30 days')
);

-- ── audit_trail ───────────────────────────────────────────────
create table if not exists audit_trail (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  event       text not null,
  actor       text,
  ip_address  text,
  user_agent  text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table clients     enable row level security;
alter table documents   enable row level security;
alter table audit_trail enable row level security;

-- Team (authenticated) can do everything
drop policy if exists "team_all_clients"    on clients;
drop policy if exists "team_all_documents"  on documents;
drop policy if exists "team_all_audit"      on audit_trail;
create policy "team_all_clients"    on clients      for all to authenticated using (true);
create policy "team_all_documents"  on documents    for all to authenticated using (true);
create policy "team_all_audit"      on audit_trail  for all to authenticated using (true);

-- Public can read a document only via signing token
drop policy if exists "public_sign_read"    on documents;
drop policy if exists "public_sign_update"  on documents;
drop policy if exists "public_audit_insert" on audit_trail;
create policy "public_sign_read"    on documents    for select to anon using (signing_token is not null and status in ('sent','viewed','signed'));
create policy "public_sign_update"  on documents    for update to anon using (signing_token is not null and status in ('sent','viewed')) with check (true);
create policy "public_audit_insert" on audit_trail  for insert to anon with check (true);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_documents_token  on documents(signing_token);
create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_client on documents(client_email);
create index if not exists idx_audit_document   on audit_trail(document_id);
