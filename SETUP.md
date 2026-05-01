# Dynamic Dusters — Backend setup

The repo now ships a Supabase schema (Postgres + Auth + RLS). The cloud
project itself is yours to create — once it exists and the keys are wired,
the dashboards plug in automatically.

## What you do (≈ 5 minutes)

### 1. Create the Supabase project

1. Go to https://supabase.com → **New project**
2. Name: `dynamic-dusters`
3. Region: pick the closest to Joburg — usually **eu-west-1 (Ireland)** or
   **af-south-1 (Cape Town)** if available on your plan
4. Database password: any strong value, save it in your password manager
5. Click **Create new project** and wait ~1 minute

### 2. Run the migrations

In the Supabase dashboard:

1. Open the **SQL Editor** (left sidebar)
2. Click **+ New query**, paste the contents of each file from
   `supabase/migrations/` in this order, **clicking Run after each**:

   | Order | File |
   |---|---|
   | 1 | `20260501000000_initial_schema.sql` |
   | 2 | `20260501000100_rls_policies.sql` |
   | 3 | `20260501000200_seed_packages.sql` |
   | 4 | `20260501000300_seed_users.sql` |

3. After running file 4, paste this query and run it to print the PINs:

   ```sql
   select full_name, role, pin from public.profiles order by role, full_name;
   ```

   Save these PINs — they are the login credentials for the placeholder
   accounts. Cameron's account is the director; share PINs only with the
   right people.

### 3. Grab the API keys

In the Supabase dashboard → **Settings** → **API**:

- Copy **Project URL** (looks like `https://xxxxxx.supabase.co`)
- Copy the **publishable** key (sometimes labelled `anon`)
  — **NOT** the `service_role` key. That one is secret, never put it in
  the frontend.

### 4. Wire up the keys locally

Create `.env.local` in the project root:

```sh
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<paste-the-publishable-key>
```

Restart `npm run dev` so Vite picks up the new env.

### 5. Wire up the keys on Vercel

1. Vercel dashboard → your `dynamic-dusters` project → **Settings → Environment Variables**
2. Add the same two `VITE_SUPABASE_*` variables for the **Production**, **Preview**, and **Development** scopes
3. Redeploy (Vercel will rebuild and the dashboards will start working)

---

## What's in the schema

| Table | Purpose |
|---|---|
| `profiles` | One row per logged-in user. Holds role + 6-digit PIN |
| `cleaner_availability` | Per-cleaner recurring weekly time windows |
| `cleaner_blocks` | Specific dates a cleaner is unavailable |
| `packages` | The Two-Hour Express / Half-Day / Full-Day / Laundry packages — director/admin can CRUD via dashboard |
| `bookings` | Customer bookings. Frozen package + frozen times — even if cleaner availability changes later, this booking's slot is fixed |

## Login

A custom PIN-only login page (`/login`) is part of Phase 2 of the rollout
(see PR ladder below). Until that PR lands, you can sign in via the
Supabase Auth API directly:

```js
import { signInWithPin } from './src/lib/supabase'
await signInWithPin('123456')
```

The login email is deterministically derived from the PIN, so the user
only ever needs to remember **6 digits**.

## Roles

| Role | Can |
|---|---|
| `cleaner` | Edit own availability + blocks; view own bookings |
| `staff` | Read-only view of all profiles + bookings |
| `manager` | Read all + approve bookings |
| `director` | Everything + manage users + archive bookings + package CRUD |
| `admin` | Same as director (intended for SolveX support / Cameron's tech operator) |

## Rollout PR ladder (planned)

1. **This PR** — schema + seed + supabase-js wired (no public-site impact)
2. **PR — Login + Cleaner dashboard** — `/login`, `/dashboard`, availability editor
3. **PR — Manager + Staff + Director dashboards** — booking approval, user mgmt, package CRUD
4. **PR — Public booking flow upgrade** — pick cleaner + slot → dummy payment → save to DB → WhatsApp confirm. This is the only PR that changes what customers see.

Each phase is a separate PR so the live site stays stable while we build.
