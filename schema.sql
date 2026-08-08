-- Charts saved by signed-in users (Neon Auth user ids are text).
-- Run this once in the Neon SQL editor against your database.
create table if not exists charts (
  user_id    text        not null,
  id         text        not null,
  name       text        not null,
  state      jsonb       not null,
  thumbnail  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists charts_user_recent_idx
  on charts (user_id, updated_at desc);
