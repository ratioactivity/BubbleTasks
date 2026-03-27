-- BubbleTasks Supabase schema
create table if not exists tasks (
  id text primary key,
  title text not null,
  category text not null,
  status text not null,
  due_date timestamptz null,
  priority int null check (priority between 1 and 5),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived boolean not null default false
);

create table if not exists bored_tasks (
  id text primary key,
  title text not null,
  created_at timestamptz not null
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

-- Optional: starter settings row
insert into settings (key, value)
values ('app_settings', '{"completionEvents": [], "layoutMode": "board"}'::jsonb)
on conflict (key) do nothing;
