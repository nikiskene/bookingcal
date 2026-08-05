import type { Handler } from '@netlify/functions';
import { isAdmin } from './_shared/auth';
import { loadConfig, saveConfig } from './_shared/storage';
import type { AppConfig } from './_shared/model';

function valid(config: AppConfig) {
  if (!config?.settings?.timezone || !Array.isArray(config?.templates)) return false;
  const slugs = new Set<string>();
  for (const t of config.templates) {
    if (!t.id || !t.slug || !t.name || !Array.isArray(t.durations) || !t.durations.length) return false;
    if (slugs.has(t.slug)) return false;
    slugs.add(t.slug);
  }
  return true;
}

export const handler: Handler = async (event) => {
  if (!isAdmin(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  if (event.httpMethod === 'GET') return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await loadConfig()) };
  if (event.httpMethod === 'PUT') {
    const config = JSON.parse(event.body || '{}') as AppConfig;
    if (!valid(config)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid configuration or duplicate slug' }) };
    await saveConfig(config);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) };
  }
  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
