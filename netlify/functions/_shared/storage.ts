import { defaultConfig, type AppConfig } from './model';

const ROW_ID = 'main';

type RuntimeDb = { url?: string; anonKey?: string };

function env(name: string) {
  return process.env[name] || '';
}

export async function loadConfig(runtime: RuntimeDb = {}): Promise<AppConfig> {
  const url = runtime.url || env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = runtime.anonKey || env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  if (!url || !anonKey) return defaultConfig();

  try {
    const response = await fetch(`${url}/rest/v1/bookingcal_config?id=eq.${encodeURIComponent(ROW_ID)}&select=config`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) return defaultConfig();
    const rows = await response.json() as Array<{ config?: AppConfig }>;
    const saved = rows[0]?.config;
    if (!saved) return defaultConfig();
    const defaults = defaultConfig();
    return {
      settings: { ...defaults.settings, ...saved.settings },
      templates: Array.isArray(saved.templates) ? saved.templates : defaults.templates,
    };
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(_config: AppConfig): Promise<void> {
  throw new Error('Server-side config writes are disabled. Use Bolt Database from the admin UI.');
}
