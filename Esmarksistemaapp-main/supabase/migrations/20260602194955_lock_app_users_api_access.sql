-- Lock direct Data API access to internal app users.
-- Login and user management now go through the esmark-sync Edge Function,
-- which uses the service role on the server side.

alter table public.app_users enable row level security;

drop policy if exists anon_full_access on public.app_users;
drop policy if exists authenticated_full_access on public.app_users;

revoke all on table public.app_users from anon;
revoke all on table public.app_users from authenticated;

grant all on table public.app_users to service_role;
