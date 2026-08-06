import { boltAuth } from './auth';
import { defaultConfig } from './defaults';
import type { AppConfig, PublicConfig } from './types';

const ROW_ID = 'main';

function client() {
  if (!boltAuth) throw new Error('Bolt Database is not configured');
  return boltAuth;
}

async function ensureAuthenticated() {
  const auth = client().auth;
  let { data: { session }, error } = await auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('Your admin session has expired. Please sign in again.');

  const expiresSoon = (session.expires_at ?? 0) * 1000 < Date.now() + 60_000;
  if (expiresSoon) {
    const refreshed = await auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    session = refreshed.data.session;
  }
  if (!session) throw new Error('Your admin session has expired. Please sign in again.');
  return session;
}

export async function loadAdminConfig(): Promise<AppConfig> {
  await ensureAuthenticated();
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
  await ensureAuthenticated();
  const { error } = await client()
    .from('bookingcal_config')
    .upsert({ id: ROW_ID, config, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) throw error;
  return config;
}

export async function loadPublicConfig(slug: string): Promise<PublicConfig> {
  const { data, error } = await client()
    .from('bookingcal_config')
    .select('config')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) throw error;
  const config = data?.config ? data.config as AppConfig : defaultConfig();
  const template = config.templates.find((item) => item.slug === slug && item.active);
  if (!template) throw new Error('Booking link not found');
  return { settings: config.settings, template };
}
