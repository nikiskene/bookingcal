import type { Handler } from '@netlify/functions';
import { getAvailableSlots } from './_shared/availability';
import { loadConfig } from './_shared/storage';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const slug = event.queryStringParameters?.slug || 'niki';
  const duration = Number(event.queryStringParameters?.duration || 30);
  const config = await loadConfig({
    url: event.headers['x-bookingcal-db-url'] || event.headers['X-Bookingcal-Db-Url'],
    anonKey: event.headers['x-bookingcal-db-key'] || event.headers['X-Bookingcal-Db-Key'],
  });
  const template = config.templates.find((t) => t.slug === slug && t.active);
  if (!template) return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Booking link not found' }) };
  if (!template.durations.includes(duration)) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid duration' }) };
  try {
    const slots = await getAvailableSlots(config, template, duration);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ slots }) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e instanceof Error ? e.message : 'Could not load availability' }) };
  }
};
