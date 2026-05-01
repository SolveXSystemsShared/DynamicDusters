-- ============================================================
-- Seed: 7 placeholder users
--   1 director (Cameron)
--   1 admin
--   2 managers
--   3 cleaners
--
-- Each user is created in auth.users so they can log in immediately.
-- The 6-digit PIN doubles as both:
--   - identifier shown on profile cards
--   - password for sign-in (low-friction for staff)
-- Sign-in email is deterministically derived from the PIN:
--   pin<PIN>@dynamicdusters.internal
-- The director/admin user can later add real users via the dashboard.
-- ============================================================

create extension if not exists pgcrypto;

-- We need to bypass the existing handle_new_user trigger's auto-PIN generation
-- when seeding, so that the PIN we used as the password matches profile.pin.
-- Update the trigger function to honor a metadata-supplied PIN if present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_pin text;
begin
  v_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    'staff'
  );
  v_pin := coalesce(
    new.raw_user_meta_data ->> 'pin',
    public.generate_unique_pin()
  );

  insert into public.profiles (id, full_name, email, role, pin, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_pin,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

-- Helper that creates an auth user + profile in one shot.
-- Returns the generated PIN so seed output prints it.
create or replace function public.seed_user(
  p_full_name text,
  p_role public.user_role,
  p_phone text default null
)
returns table(full_name text, pin text, login_email text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_pin text;
  v_user_id uuid := gen_random_uuid();
  v_email text;
begin
  v_pin := public.generate_unique_pin();
  v_email := 'pin' || v_pin || '@dynamicdusters.internal';

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_pin, gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers',array['email']),
    jsonb_build_object(
      'full_name', p_full_name,
      'role', p_role::text,
      'phone', p_phone,
      'pin', v_pin
    ),
    now(), now(),
    '', '', '', ''
  );

  -- Identity row required for password auth on newer Supabase versions
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  return query select p_full_name, v_pin, v_email;
end;
$$;

-- ---------- Run the seed ----------
do $$
declare
  r record;
begin
  for r in
    select * from public.seed_user('Cameron Roberts',  'director', '+27 64 555 2612')
    union all select * from public.seed_user('Athena Ngubane',  'admin',    null)
    union all select * from public.seed_user('Banele Khumalo',  'manager',  null)
    union all select * from public.seed_user('Sasha Pillay',    'manager',  null)
    union all select * from public.seed_user('Lerato Mahlangu', 'cleaner',  null)
    union all select * from public.seed_user('Khaya Dlamini',   'cleaner',  null)
    union all select * from public.seed_user('Nadia Booysen',   'cleaner',  null)
  loop
    raise notice 'Seeded % | PIN=% | login=%', r.full_name, r.pin, r.login_email;
  end loop;
end $$;

-- ---------- Seed default availability for the 3 cleaners ----------
-- Mon–Fri 08:00–14:00 default, owner can edit on the dashboard.
insert into public.cleaner_availability (cleaner_id, day_of_week, start_time, end_time)
select p.id, dow, time '08:00', time '14:00'
from public.profiles p
cross join generate_series(1,5) as dow
where p.role = 'cleaner';

-- View the seeded PINs (run this after running the migration to retrieve them):
--   select full_name, pin, email from public.profiles order by role, full_name;
