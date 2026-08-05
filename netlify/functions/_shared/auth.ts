import { createHmac, timingSafeEqual } from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';

const COOKIE = 'bookingcal_session';
const MAX_AGE = 60 * 60 * 24 * 7;

function b64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSessionCookie() {
  const payload = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function readCookie(event: HandlerEvent, name: string) {
  const raw = event.headers.cookie || event.headers.Cookie || '';
  return raw.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

export function isAdmin(event: HandlerEvent) {
  try {
    const token = readCookie(event, COOKIE);
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    const expected = sign(payload);
    if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number };
    return parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = createHmac('sha256', 'bookingcal').update(input).digest();
  const b = createHmac('sha256', 'bookingcal').update(expected).digest();
  return timingSafeEqual(a, b);
}
