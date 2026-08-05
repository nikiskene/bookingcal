import type { Handler } from '@netlify/functions';
import { createSessionCookie, passwordMatches } from './_shared/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const { password = '' } = JSON.parse(event.body || '{}');
  if (!passwordMatches(String(password))) return { statusCode: 401, body: JSON.stringify({ error: 'Wrong password' }) };
  return { statusCode: 200, headers: { 'Set-Cookie': createSessionCookie(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};
