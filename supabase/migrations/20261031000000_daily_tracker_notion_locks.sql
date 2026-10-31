-- Backend-only leases serialize uploads for the same user's date.
create table if not exists public.bubbletasks_notion_sync_locks (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  lease_id uuid not null,
  expires_at timestamptz not null,
  primary key (user_id, log_date)
);
alter table public.bubbletasks_notion_sync_locks enable row level security;
revoke all on public.bubbletasks_notion_sync_locks from public, anon, authenticated;
grant all on public.bubbletasks_notion_sync_locks to service_role;

create or replace function public.bubbletasks_claim_notion_sync(p_user_id uuid, p_date date, p_lease uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.bubbletasks_notion_sync_locks(user_id,log_date,lease_id,expires_at)
  values(p_user_id,p_date,p_lease,now()+interval '180 seconds')
  on conflict(user_id,log_date) do update
    set lease_id=excluded.lease_id, expires_at=excluded.expires_at
    where bubbletasks_notion_sync_locks.expires_at < now();
  return found;
end;
$$;
create or replace function public.bubbletasks_release_notion_sync(p_user_id uuid, p_date date, p_lease uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.bubbletasks_notion_sync_locks where user_id=p_user_id and log_date=p_date and lease_id=p_lease;
$$;
revoke all on function public.bubbletasks_claim_notion_sync(uuid,date,uuid) from public, anon, authenticated;
revoke all on function public.bubbletasks_release_notion_sync(uuid,date,uuid) from public, anon, authenticated;
grant execute on function public.bubbletasks_claim_notion_sync(uuid,date,uuid) to service_role;
grant execute on function public.bubbletasks_release_notion_sync(uuid,date,uuid) to service_role;
