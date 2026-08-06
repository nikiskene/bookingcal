import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const boltAuth = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function requireAuthClient() {
  if (!boltAuth) {
    throw new Error('Bolt Database authentication is not configured yet.');
  }
  return boltAuth;
}

export async function signIn(email: string, password: string) {
  const client = requireAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const client = requireAuthClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getAccessToken() {
  if (!boltAuth) return null;
  const { data } = await boltAuth.auth.getSession();
  return data.session?.access_token || null;
}

export async function getCurrentUser() {
  if (!boltAuth) return null;
  const { data } = await boltAuth.auth.getUser();
  return data.user || null;
}
