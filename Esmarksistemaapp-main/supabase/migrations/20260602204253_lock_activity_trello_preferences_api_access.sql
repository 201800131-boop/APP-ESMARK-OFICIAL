begin;

drop policy if exists anon_full_access on public.activity_logs;
drop policy if exists authenticated_full_access on public.activity_logs;
drop policy if exists anon_full_access on public.trello_preferences;
drop policy if exists authenticated_full_access on public.trello_preferences;

alter table public.activity_logs enable row level security;
alter table public.activity_logs force row level security;
alter table public.trello_preferences enable row level security;
alter table public.trello_preferences force row level security;

revoke all on table public.activity_logs from anon, authenticated;
revoke all on table public.trello_preferences from anon, authenticated;

grant all on table public.activity_logs to service_role;
grant all on table public.trello_preferences to service_role;

commit;
