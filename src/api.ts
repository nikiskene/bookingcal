import { loadAdminConfig, loadPublicConfig, saveAdminConfig } from './configStore';
import type { AppConfig, PublicConfig, Slot } from './types';

const publicBackendHeaders = {
  'x-bookingcal-db-url': import.meta.env.VITE_SUPABASE_URL || '',
  'x-bookingcal-db-key': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...publicBackendHeaders,
      ...(options?.headers || {}),
    },
    ...options,
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error(`API unavailable (${response.status})`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data as T;
}

export const api = {
  getAdminConfig: () => loadAdminConfig(),
  saveAdminConfig: (config: AppConfig) => saveAdminConfig(config),
  getPublicConfig: (slug: string): Promise<PublicConfig> => loadPublicConfig(slug),
  getAvailability: (slug: string, duration: number) => jsonRequest<{ slots: Slot[] }>(`/api/availability?slug=${encodeURIComponent(slug)}&duration=${duration}`),
  book: (payload: unknown) => jsonRequest<{ ok: true; meetingUrl: string; eventId: string }>('/api/book', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
