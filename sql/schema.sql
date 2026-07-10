-- ============================================================
-- Semi-Poupi 2026 — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query > Run
--
-- Ce fichier est écrit pour être rejouable sans risque autant de fois que
-- nécessaire (que les tables/policies existent déjà ou non) : chaque
-- "create policy" est précédé d'un "drop policy if exists" correspondant,
-- car contrairement à "create table if not exists", Postgres n'a pas de
-- "create policy if not exists" — sans ce drop, recoller ce fichier une
-- 2e fois échoue dès la 1ère policy déjà existante et n'exécute JAMAIS la
-- suite du script (c'est ce qui empêchait la table game_scores d'être
-- créée lors des tentatives précédentes).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Table des inscriptions (RSVP) ----------
-- Identification par email/téléphone (voir plus bas) plutôt que par nom seul :
-- name_key n'est plus une clé unique, juste une valeur de repli pour les
-- réponses sans email ni téléphone renseignés.
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null,
  email text,
  phone text,
  attending text not null check (attending in ('yes', 'maybe', 'no')),
  tshirt_size text,
  arrival_time text,
  departure_time text,
  transport text,
  comment text,
  created_at timestamptz not null default now()
);

-- Colonnes ajoutées après la création initiale de la table : sans effet si
-- elles existent déjà (sûr à recoller à chaque mise à jour du schéma).
alter table participants add column if not exists transport text;
alter table participants add column if not exists email text;
alter table participants add column if not exists phone text;

-- L'ancienne version imposait un nom unique (upsert sur name_key). On identifie
-- désormais une réponse par email ou téléphone en priorité (voir inscription.js),
-- donc deux personnes peuvent partager un même nom sans conflit.
alter table participants drop constraint if exists participants_name_key_key;

alter table participants enable row level security;

drop policy if exists "participants: anyone can insert" on participants;
create policy "participants: anyone can insert"
  on participants for insert
  to anon
  with check (true);

drop policy if exists "participants: anyone can update (upsert)" on participants;
create policy "participants: anyone can update (upsert)"
  on participants for update
  to anon
  using (true)
  with check (true);

drop policy if exists "participants: anyone can read" on participants;
create policy "participants: anyone can read"
  on participants for select
  to anon
  using (true);

-- ---------- Table des propositions de nom d'équipe ----------
-- (conservée pour l'historique même si la page publique de vote a été retirée)
create table if not exists team_name_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  proposed_by text,
  created_at timestamptz not null default now()
);

alter table team_name_options enable row level security;

drop policy if exists "options: anyone can insert" on team_name_options;
create policy "options: anyone can insert"
  on team_name_options for insert
  to anon
  with check (true);

drop policy if exists "options: anyone can read" on team_name_options;
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

drop policy if exists "votes: anyone can insert" on team_name_votes;
create policy "votes: anyone can insert"
  on team_name_votes for insert
  to anon
  with check (true);

drop policy if exists "votes: anyone can update (upsert / change vote)" on team_name_votes;
create policy "votes: anyone can update (upsert / change vote)"
  on team_name_votes for update
  to anon
  using (true)
  with check (true);

drop policy if exists "votes: anyone can read" on team_name_votes;
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

drop policy if exists "scores: anyone can insert" on game_scores;
create policy "scores: anyone can insert"
  on game_scores for insert
  to anon
  with check (true);

drop policy if exists "scores: anyone can update (upsert / meilleur score du jour)" on game_scores;
create policy "scores: anyone can update (upsert / meilleur score du jour)"
  on game_scores for update
  to anon
  using (true)
  with check (true);

drop policy if exists "scores: anyone can read" on game_scores;
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
