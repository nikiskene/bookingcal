import { boltAuth } from './auth';
import { defaultConfig } from './defaults';
import type { AppConfig, PublicConfig } from './types';

const ROW_ID = 'main';

function client() {
  if (!boltAuth) throw new Error('Bolt Database is not configured');
  return boltAuth;
}

export async function loadAdminConfig(): Promise<AppConfig> {
  const { data, error } = await client()
    .from('bookingcal_config')
    .select('config')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data?.config) return defaultConfig();
  return data.config as AppConfig;
}

export async function saveAdminConfig(config: AppConfig): Promise<AppConfig> {
  const { error } = await client()
    .from('bookingcal_config')
    .upsert({ id: ROW_ID, config, updated_at: new Date().toISOString() });

  if (error) throw error;
  return config;
}

export async function loadPublicConfig(slug: string): Promise<PublicConfig> {
  const config = await loadAdminConfig();
  const template = config.templates.find((item) => item.slug === slug && item.active);
  if (!template) throw new Error('Booking link not found');
  return { settings: config.settings, template };
}
