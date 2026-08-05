import { getStore } from '@netlify/blobs';
import { defaultConfig, type AppConfig } from './model';

const STORE = 'bookingcal-config';
const KEY = 'config.json';

export async function loadConfig(): Promise<AppConfig> {
  try {
    const store = getStore(STORE);
    const saved = await store.get(KEY, { type: 'json' }) as AppConfig | null;
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

export async function saveConfig(config: AppConfig): Promise<void> {
  const store = getStore(STORE);
  await store.setJSON(KEY, config);
}
