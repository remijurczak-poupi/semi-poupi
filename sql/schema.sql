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

-- ============================================================
-- Mise à jour : système de points des jeux (Motus, Mots-mêlés, Memory,
-- Démineur, Tir Arcade — le Morpion n'a pas de classement, parties illimitées)
-- ============================================================

create table if not exists game_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  player_key text not null,
  game_key text not null check (game_key in ('motus', 'motsmeles', 'memory', 'demineur', 'tir')),
  play_date date not null,
  points int not null check (points >= 0 and points <= 100),
  detail text,
  created_at timestamptz not null default now(),
  unique (player_key, game_key, play_date)
);

alter table game_scores enable row level security;

create policy "scores: anyone can insert"
  on game_scores for insert
  to anon
  with check (true);

create policy "scores: anyone can update (upsert / meilleur score du jour)"
  on game_scores for update
  to anon
  using (true)
  with check (true);

create policy "scores: anyone can read"
  on game_scores for select
  to anon
  using (true);

create index if not exists game_scores_daily_idx on game_scores (game_key, play_date, points desc);
create index if not exists game_scores_player_idx on game_scores (player_key);

-- Classement global : cumul des points par joueur, tous jeux et tous jours confondus.
create or replace view game_scores_global as
select
  player_key,
  (array_agg(player_name order by created_at desc))[1] as player_name,
  sum(points)::int as total_points,
  count(*) as games_played
from game_scores
group by player_key
order by total_points desc;
