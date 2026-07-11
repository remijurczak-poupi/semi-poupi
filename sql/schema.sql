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

-- "to anon, authenticated" plutôt que juste "to anon" sur les 2 policies ci-dessous : le
-- client Supabase garde la connexion admin en mémoire (localStorage) sur TOUT le site, pas
-- juste sur admin.html. Donc si Rémi (ou n'importe qui) reste connecté à l'admin dans le
-- même navigateur puis va remplir le formulaire d'inscription dans un autre onglet du même
-- site, ses requêtes partent avec le rôle "authenticated" au lieu de "anon" — une policy
-- "to anon" uniquement les bloquerait alors silencieusement. Voir la même explication, plus
-- détaillée, au niveau de game_scores plus bas (c'est ce qui causait le bug des scores
-- invisibles).
drop policy if exists "participants: anyone can insert" on participants;
create policy "participants: anyone can insert"
  on participants for insert
  to anon, authenticated
  with check (true);

drop policy if exists "participants: anyone can update (upsert)" on participants;
create policy "participants: anyone can update (upsert)"
  on participants for update
  to anon, authenticated
  using (true)
  with check (true);

-- Lecture réservée aux comptes connectés (Authentication > Users côté Supabase) :
-- avant cette mise à jour, n'importe qui savait interroger l'API publique pouvait lire
-- tous les emails/téléphones sans même passer par la page admin. Il faut donc créer un
-- compte pour l'admin dans Supabase (Authentication > Users > Add user) et se connecter
-- avec sur admin.html — l'insertion/mise à jour reste ouverte à tout le monde (le
-- formulaire d'inscription public continue de fonctionner sans compte).
drop policy if exists "participants: anyone can read" on participants;
drop policy if exists "participants: authenticated can read" on participants;
create policy "participants: authenticated can read"
  on participants for select
  to authenticated
  using (true);

-- ---------- Table des propositions de nom d'équipe ----------
-- (conservée pour l'historique même si la page publique de vote ET le tableau admin
-- correspondant ont été retirés — plus aucune page du site ne lit ces deux tables
-- désormais. Laissées en place plutôt que supprimées pour ne pas perdre les données
-- existantes ; à supprimer pour de bon avec un "drop table" si tu es sûr de ne plus
-- jamais en avoir besoin.)
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
--
-- ATTENTION : comme le site est 100% statique (pas de serveur de jeu), rien n'empêche
-- réellement quelqu'un de technique d'envoyer un faux score directement à l'API Supabase
-- sans avoir joué. La contrainte ci-dessous (date pas dans le futur) ferme le cas le plus
-- facile à exploiter (pré-remplir plein de jours d'avance), mais un vrai anti-triche
-- demanderait un backend qui rejoue/valide la partie, hors de portée d'un site statique.
-- Si un score de tête de classement paraît franchement louche, il vaut mieux trancher à
-- l'oeil (table admin) que de compter sur la base pour l'empêcher.
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

-- Empêche de soumettre un score pour un jour dans le futur (ex : pré-remplir tous les
-- jours jusqu'en décembre d'un coup pour gonfler artificiellement le classement général).
-- Comme pour les policies, "add constraint if not exists" n'existe pas en Postgres —
-- d'où le drop-puis-add, sûr à recoller à chaque mise à jour du schéma.
alter table game_scores drop constraint if exists game_scores_play_date_not_future;
alter table game_scores add constraint game_scores_play_date_not_future check (play_date <= current_date);

alter table game_scores enable row level security;

-- ⚠️ BUG CORRIGÉ ICI (mise à jour 25) : ces 3 policies étaient réservées "to anon", ce qui
-- marche pour un·e joueur·se normal·e (jamais connecté·e), mais casse dès que le même
-- navigateur a une session admin active — même sur une page qui n'a rien à voir avec
-- l'admin. En effet, supabase-js retient la connexion (Authentication) dans le
-- localStorage du site entier, pas juste sur admin.html : dès que Rémi se connecte une
-- fois sur admin.html, TOUTES les requêtes envoyées depuis ce même navigateur (y compris
-- en rejouant à un jeu ou en consultant classement.html dans un autre onglet) partent avec
-- le rôle "authenticated" au lieu de "anon", jusqu'à un clic sur "Se déconnecter". Une
-- policy "to anon" uniquement ignore alors ces requêtes (lecture qui renvoie 0 ligne sans
-- erreur, écriture refusée) — c'est ce qui causait le classement du jour vide et le
-- tableau "Scores des jeux" vide dans l'admin. "to anon, authenticated" couvre les deux cas
-- et rend le comportement indépendant de l'état de connexion du navigateur.
drop policy if exists "scores: anyone can insert" on game_scores;
create policy "scores: anyone can insert"
  on game_scores for insert
  to anon, authenticated
  with check (true);

drop policy if exists "scores: anyone can update (upsert / meilleur score du jour)" on game_scores;
create policy "scores: anyone can update (upsert / meilleur score du jour)"
  on game_scores for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "scores: anyone can read" on game_scores;
create policy "scores: anyone can read"
  on game_scores for select
  to anon, authenticated
  using (true);

-- Suppression réservée aux comptes connectés (même compte admin que pour `participants`) :
-- c'est ce qui permet le nouveau bloc "Scores des jeux" de admin.html (modifier un score,
-- supprimer une ligne, ou tout réinitialiser d'un coup avant le vrai lancement du site).
-- Sans cette policy, Postgres refuse silencieusement toute suppression (aucune policy
-- "delete" = accès refusé par défaut avec Row Level Security).
drop policy if exists "scores: authenticated can delete" on game_scores;
create policy "scores: authenticated can delete"
  on game_scores for delete
  to authenticated
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

-- ============================================================
-- Mise à jour : réglages du site (interrupteurs simples)
--
-- Table à une ligne par réglage, pour activer/désactiver des sections du site depuis
-- l'admin sans avoir besoin de redéployer. Premier usage : masquer complètement la page
-- et le lien "Parrains" tant qu'aucun parrain n'est encore annoncé, pour garder la
-- surprise, puis la réactiver d'un clic le jour venu (voir admin.html → "Réglages du
-- site" et js/site-settings.js).
-- ============================================================

create table if not exists site_settings (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

-- Lecture ouverte à tout le monde (pas besoin d'être connecté) : chaque page du site doit
-- pouvoir savoir si une section est à afficher, y compris pour un·e visiteur·se normal·e.
drop policy if exists "settings: anyone can read" on site_settings;
create policy "settings: anyone can read"
  on site_settings for select
  to anon, authenticated
  using (true);

-- Modification réservée aux comptes admin connectés (même compte que pour
-- participants/game_scores) : seul·e l'organisateur·rice peut changer ces réglages.
drop policy if exists "settings: authenticated can update" on site_settings;
create policy "settings: authenticated can update"
  on site_settings for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "settings: authenticated can insert" on site_settings;
create policy "settings: authenticated can insert"
  on site_settings for insert
  to authenticated
  with check (true);

-- Valeur de départ : Parrains masqué (pas encore de parrain à annoncer). "on conflict do
-- nothing" : ne touche pas au réglage si déjà présent (recoller ce fichier après avoir
-- réactivé la section depuis l'admin ne doit pas la remasquer par erreur).
insert into site_settings (key, enabled) values ('parrains', false)
on conflict (key) do nothing;
