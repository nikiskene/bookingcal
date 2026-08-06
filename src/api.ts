import { getAccessToken } from './auth';
import type { AppConfig, PublicConfig, Slot } from './types';

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API unavailable (${response.status})`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data as T;
}

async function adminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Unauthorized');
  return jsonRequest<T>(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options?.headers || {}) },
  });
}

export const api = {
  getAdminConfig: async () => {
    const config = await adminRequest<AppConfig>('/api/admin/config');
    if (!config || !config.settings || !Array.isArray(config.templates)) {
      throw new Error('Invalid admin configuration returned by server');
    }
    return config;
  },
  saveAdminConfig: (config: AppConfig) => adminRequest<AppConfig>('/api/admin/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  }),
  getPublicConfig: (slug: string) => jsonRequest<PublicConfig>(`/api/public/config?slug=${encodeURIComponent(slug)}`),
  getAvailability: (slug: string, duration: number) => jsonRequest<{ slots: Slot[] }>(`/api/availability?slug=${encodeURIComponent(slug)}&duration=${duration}`),
  book: (payload: unknown) => jsonRequest<{ ok: true; meetingUrl: string; eventId: string }>('/api/book', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
