-- Already applied manually during setup. No browser access to connection tokens.
create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  scope text not null,
  connected_at timestamptz not null default now()
);
create table if not exists public.google_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
revoke all on public.google_calendar_connections from public, anon, authenticated;
revoke all on public.google_calendar_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on public.google_calendar_connections to service_role;
grant select, insert, update, delete on public.google_calendar_oauth_states to service_role;
