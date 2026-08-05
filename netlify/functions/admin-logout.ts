import type { Handler } from '@netlify/functions';
import { clearSessionCookie } from './_shared/auth';

export const handler: Handler = async () => ({
  statusCode: 200,
  headers: { 'Set-Cookie': clearSessionCookie(), 'Content-Type': 'application/json' },
  body: JSON.stringify({ ok: true }),
});
