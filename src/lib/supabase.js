import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Don't crash the build — but warn loudly in dev so missing env doesn't go unnoticed.
  // Public site sections that don't need DB will still render.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'See SETUP.md for first-run instructions.'
  )
}

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null

export const hasSupabase = !!supabase

/**
 * Sign in with a 6-digit PIN.
 * The email is deterministically derived from the PIN.
 * Returns { data, error } shaped like supabase.auth.signInWithPassword.
 */
export async function signInWithPin(pin) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!/^\d{6}$/.test(pin)) {
    return { data: null, error: { message: 'PIN must be exactly 6 digits' } }
  }
  const email = `pin${pin}@dynamicdusters.internal`
  return supabase.auth.signInWithPassword({ email, password: pin })
}

export async function signOut() {
  if (!supabase) return
  return supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}
