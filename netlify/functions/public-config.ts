import type { Handler } from '@netlify/functions';
import { loadConfig } from './_shared/storage';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const slug = event.queryStringParameters?.slug || 'niki';
  const config = await loadConfig();
  const template = config.templates.find((t) => t.slug === slug && t.active);
  if (!template) return { statusCode: 404, body: JSON.stringify({ error: 'This booking link is not available' }) };
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ settings: config.settings, template }) };
};
