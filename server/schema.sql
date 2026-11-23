-- Survive The Island — database schema (PostgreSQL / Supabase). Applied automatically on server start.
create table if not exists profiles (
  id          text primary key,            -- sha256(secret client token), never the token itself
  name        text not null,
  avatar      text not null default 'gojirex',
  games       integer not null default 0,
  wins        integer not null default 0,
  losses      integer not null default 0,
  rescued     integer not null default 0,
  lost        integer not null default 0,
  best_score  integer not null default 0,
  char_counts jsonb not null default '{}'::jsonb,
  badges      jsonb not null default '[]'::jsonb,
  updated_at  bigint not null default 0
);
create index if not exists profiles_leaderboard_idx on profiles (wins desc, rescued desc);

create table if not exists games (
  id          bigserial primary key,
  room_code   text not null,
  mode        text not null,
  turns       integer not null,
  duration_ms bigint not null,
  results     jsonb not null,
  played_at   timestamptz not null default now()
);
