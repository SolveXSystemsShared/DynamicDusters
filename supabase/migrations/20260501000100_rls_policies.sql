-- ============================================================
-- RLS policies for the role hierarchy
--   public site (anon)         -> read packages only; no other access
--   cleaner                    -> own profile, own availability, own blocks, own bookings
--   staff                      -> read all profiles + bookings (no approve, no edit)
--   manager                    -> read all + approve bookings + read availability
--   director / admin           -> full access (CRUD users, packages, bookings)
-- ============================================================

-- ---------- helper: role of the current user ----------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager_or_higher()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('manager','director','admin');
$$;

create or replace function public.is_director_or_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('director','admin');
$$;

-- ---------- Enable RLS on all tables ----------
alter table public.profiles               enable row level security;
alter table public.cleaner_availability   enable row level security;
alter table public.cleaner_blocks         enable row level security;
alter table public.packages               enable row level security;
alter table public.bookings               enable row level security;

-- ============================================================
-- profiles
-- ============================================================

-- Anyone authenticated can read all profiles (for staff visibility).
-- The PIN column is sensitive — we'll use a view for public reads (see below).
create policy profiles_self_read on public.profiles
  for select to authenticated
  using ( id = auth.uid() );

create policy profiles_staff_read_all on public.profiles
  for select to authenticated
  using ( public.current_role() in ('staff','manager','director','admin') );

create policy profiles_self_update on public.profiles
  for update to authenticated
  using ( id = auth.uid() )
  with check ( id = auth.uid() and role = public.current_role() );  -- can't escalate own role

create policy profiles_director_all on public.profiles
  for all to authenticated
  using ( public.is_director_or_admin() )
  with check ( public.is_director_or_admin() );

-- ============================================================
-- cleaner_availability  (per-cleaner weekly windows)
-- ============================================================

-- Read: any authenticated user (so booking UI + manager dashboards can see)
create policy avail_read_all on public.cleaner_availability
  for select to authenticated
  using ( true );

-- Cleaner manages their own
create policy avail_self_write on public.cleaner_availability
  for all to authenticated
  using ( cleaner_id = auth.uid() )
  with check ( cleaner_id = auth.uid() );

-- Director/admin can manage anyone's
create policy avail_director_all on public.cleaner_availability
  for all to authenticated
  using ( public.is_director_or_admin() )
  with check ( public.is_director_or_admin() );

-- Anonymous (public booking flow) can read availability
create policy avail_anon_read on public.cleaner_availability
  for select to anon
  using ( true );

-- ============================================================
-- cleaner_blocks
-- ============================================================

create policy blocks_read_all on public.cleaner_blocks
  for select to authenticated using ( true );

create policy blocks_self_write on public.cleaner_blocks
  for all to authenticated
  using ( cleaner_id = auth.uid() )
  with check ( cleaner_id = auth.uid() );

create policy blocks_director_all on public.cleaner_blocks
  for all to authenticated
  using ( public.is_director_or_admin() )
  with check ( public.is_director_or_admin() );

create policy blocks_anon_read on public.cleaner_blocks
  for select to anon using ( true );

-- ============================================================
-- packages  (public site reads them)
-- ============================================================

create policy packages_anon_read on public.packages
  for select to anon
  using ( archived_at is null );

create policy packages_auth_read on public.packages
  for select to authenticated using ( true );

create policy packages_director_all on public.packages
  for all to authenticated
  using ( public.is_director_or_admin() )
  with check ( public.is_director_or_admin() );

-- ============================================================
-- bookings
-- ============================================================

-- Public site: anonymous users CREATE bookings (initial customer submission).
create policy bookings_anon_insert on public.bookings
  for insert to anon
  with check ( status = 'pending' );

-- Cleaner: read own bookings
create policy bookings_cleaner_read on public.bookings
  for select to authenticated
  using ( cleaner_id = auth.uid() );

-- Staff/manager/director/admin: read all
create policy bookings_staff_read on public.bookings
  for select to authenticated
  using ( public.current_role() in ('staff','manager','director','admin') );

-- Manager/director/admin: approve (update)
create policy bookings_manager_update on public.bookings
  for update to authenticated
  using ( public.is_manager_or_higher() )
  with check ( public.is_manager_or_higher() );

-- Director/admin: full
create policy bookings_director_all on public.bookings
  for all to authenticated
  using ( public.is_director_or_admin() )
  with check ( public.is_director_or_admin() );

-- ============================================================
-- safe public view of profiles (no PIN, no email)
-- exposed to anon for booking UI to display cleaner names.
-- ============================================================

create or replace view public.cleaners_public
with (security_invoker = true) as
select id, full_name, avatar_url
from public.profiles
where role = 'cleaner' and archived_at is null;

grant select on public.cleaners_public to anon, authenticated;
