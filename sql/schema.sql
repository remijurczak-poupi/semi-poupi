-- ============================================================
-- Semi-Poupi 2026 — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Table des inscriptions (RSVP) ----------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  attending text not null check (attending in ('yes', 'maybe', 'no')),
  tshirt_size text,
  arrival_time text,
  departure_time text,
  comment text,
  created_at timestamptz not null default now()
);

alter table participants enable row level security;

create policy "participants: anyone can insert"
  on participants for insert
  to anon
  with check (true);

create policy "participants: anyone can update (upsert)"
  on participants for update
  to anon
  using (true)
  with check (true);

create policy "participants: anyone can read"
  on participants for select
  to anon
  using (true);

-- ---------- Table des propositions de nom d'équipe ----------
create table if not exists team_name_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  proposed_by text,
  created_at timestamptz not null default now()
);

alter table team_name_options enable row level security;

create policy "options: anyone can insert"
  on team_name_options for insert
  to anon
  with check (true);

create policy "options: anyone can read"
  on team_name_options for select
  to anon
  using (true);

-- ---------- Table des votes ----------
create table if not exists team_name_votes (
  id uuid primary key default gen_random_uuid(),
  voter_name text not null,
  voter_key text not null unique,
  option_id uuid not null references team_name_options(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table team_name_votes enable row level security;

create policy "votes: anyone can insert"
  on team_name_votes for insert
  to anon
  with check (true);

create policy "votes: anyone can update (upsert / change vote)"
  on team_name_votes for update
  to anon
  using (true)
  with check (true);

create policy "votes: anyone can read"
  on team_name_votes for select
  to anon
  using (true);

-- ---------- Quelques propositions de nom pour démarrer ----------
insert into team_name_options (label, proposed_by) values
  ('Les Poupi Runners', 'Semi-Poupi'),
  ('Team Poupi 24h', 'Semi-Poupi'),
  ('Les Ours Polaires du Téléthon', 'Semi-Poupi')
on conflict (label) do nothing;
