-- ============================================================
-- Dynamic Dusters — initial schema
-- Roles: cleaner, staff, manager, director, admin
-- ============================================================

-- ---------- ENUMS ----------
create type public.user_role as enum ('cleaner', 'staff', 'manager', 'director', 'admin');
create type public.package_type as enum ('half-day', 'full-day', 'addon', 'custom');
create type public.booking_status as enum ('pending', 'approved', 'completed', 'archived', 'nullified');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');

-- ---------- HELPER: generate a unique 6-digit PIN ----------
create or replace function public.generate_unique_pin()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := lpad(floor(random() * 1000000)::int::text, 6, '0');
    perform 1 from public.profiles where pin = candidate;
    if not found then
      return candidate;
    end if;
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Could not generate a unique PIN after 50 attempts';
    end if;
  end loop;
end;
$$;

-- ---------- TABLE: profiles ----------
-- One row per auth.users entry. Holds role + PIN + display info.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'staff',
  pin text not null unique check (pin ~ '^[0-9]{6}$'),
  phone text,
  avatar_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_archived_idx on public.profiles(archived_at);

-- ---------- TABLE: cleaner_availability ----------
-- Recurring weekly time windows defined by the cleaner.
-- Multiple rows per cleaner per day allowed.
create table public.cleaner_availability (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint avail_window_valid check (end_time > start_time)
);

create index avail_cleaner_idx on public.cleaner_availability(cleaner_id);
create index avail_day_idx on public.cleaner_availability(day_of_week);

-- ---------- TABLE: cleaner_blocks ----------
-- One-off date blocks (vacation, sick day, etc.)
create table public.cleaner_blocks (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.profiles(id) on delete cascade,
  block_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (cleaner_id, block_date)
);

create index blocks_cleaner_idx on public.cleaner_blocks(cleaner_id);
create index blocks_date_idx on public.cleaner_blocks(block_date);

-- ---------- TABLE: packages ----------
-- Director / admin maintain. Bookings store a snapshot, so price changes
-- here do not retroactively affect existing bookings.
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.package_type not null,
  duration_label text not null,                         -- e.g. "4 hours" or "Per load"
  duration_hours numeric(5,2),                          -- nullable for add-ons
  base_price numeric(10,2) not null,
  best_for text,
  bullets jsonb not null default '[]'::jsonb,           -- ["x", "y", "z"]
  icon_name text,                                       -- lucide icon key
  base_bedrooms smallint default 1,
  base_bathrooms smallint default 1,
  display_order smallint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packages_archived_idx on public.packages(archived_at);
create index packages_order_idx on public.packages(display_order);

-- ---------- TABLE: bookings ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null unique,                     -- e.g. DD-2026-00001

  -- Customer details
  customer_name text not null,
  customer_phone text,
  customer_email text,
  suburb text not null,
  property_type text,
  bedrooms smallint not null default 1,
  bathrooms smallint not null default 1,
  notes text,

  -- Booking specifics
  package_id uuid references public.packages(id),
  package_snapshot jsonb not null,                      -- frozen package at booking time
  cleaner_id uuid references public.profiles(id) on delete set null,

  booking_date date not null,
  start_time time not null,
  end_time time not null,                               -- frozen — does NOT update if cleaner availability changes
  duration_hours numeric(5,2) not null,

  add_laundry boolean not null default false,
  laundry_loads smallint not null default 0,

  estimated_total numeric(10,2) not null,
  price_breakdown jsonb,

  status public.booking_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  nullified_by uuid references public.profiles(id) on delete set null,
  nullified_at timestamptz,
  nullified_reason text,

  payment_status public.payment_status not null default 'unpaid',
  payment_ref text,
  payment_paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_window_valid check (end_time > start_time)
);

create index bookings_status_idx on public.bookings(status);
create index bookings_cleaner_idx on public.bookings(cleaner_id);
create index bookings_date_idx on public.bookings(booking_date);
create index bookings_ref_idx on public.bookings(booking_ref);

-- ---------- BOOKING REF GENERATOR ----------
create sequence public.booking_seq start 1;

create or replace function public.generate_booking_ref()
returns text
language sql
volatile
as $$
  select 'DD-' || to_char(current_date, 'YYYY') || '-' ||
         lpad(nextval('public.booking_seq')::text, 5, '0');
$$;

-- Set default after function is created
alter table public.bookings
  alter column booking_ref set default public.generate_booking_ref();

-- ---------- updated_at TRIGGERS ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch       before update on public.profiles            for each row execute function public.touch_updated_at();
create trigger avail_touch          before update on public.cleaner_availability for each row execute function public.touch_updated_at();
create trigger packages_touch       before update on public.packages            for each row execute function public.touch_updated_at();
create trigger bookings_touch       before update on public.bookings            for each row execute function public.touch_updated_at();

-- ---------- AUTH HOOK: auto-create profile row on signup ----------
-- Reads from raw_user_meta_data on signup payload.
-- NOTE: meta data is set by the inviter via the admin API at user-create time
-- so it is trustworthy in this flow (we do not let users self-register).
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
  v_pin := public.generate_unique_pin();

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
