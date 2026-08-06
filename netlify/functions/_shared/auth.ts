import type { HandlerEvent } from '@netlify/functions';

function bearerToken(event: HandlerEvent) {
  const header = event.headers.authorization || event.headers.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function isAdmin(event: HandlerEvent) {
  const token = bearerToken(event);
  const url = process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!token || !url || !anonKey) return false;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return false;
    const user = await response.json() as { id?: string };
    return Boolean(user.id);
  } catch {
    return false;
  }
}
