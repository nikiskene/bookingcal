import { loadAdminConfig, loadPublicConfig, saveAdminConfig } from './configStore';
import type { AppConfig, PublicConfig, Slot } from './types';

function runtimeDbHeaders() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && anonKey
    ? { 'x-bookingcal-db-url': url, 'x-bookingcal-db-key': anonKey }
    : {};
}

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...runtimeDbHeaders(),
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

export type ManagedMeeting = {
  token: string;
  eventId: string;
  slug: string;
  name: string;
  email: string;
  purpose: string;
  meetingMethod: 'zoom' | 'teams';
  startUtc: string;
  endUtc: string;
  duration: number;
  viewerTimezone: string;
  cancelled?: boolean;
};

export const api = {
  getAdminConfig: () => loadAdminConfig(),
  saveAdminConfig: (config: AppConfig) => saveAdminConfig(config),
  getPublicConfig: (slug: string): Promise<PublicConfig> => loadPublicConfig(slug),
  getAvailability: (slug: string, duration: number) => jsonRequest<{ slots: Slot[] }>(`/api/availability?slug=${encodeURIComponent(slug)}&duration=${duration}`),
  book: (payload: unknown) => jsonRequest<{ ok: true; meetingUrl: string; eventId: string; manageUrl?: string }>('/api/book', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getManagedMeeting: (token: string) => jsonRequest<ManagedMeeting>(`/api/manage?token=${encodeURIComponent(token)}`),
  getManageAvailability: (token: string) => jsonRequest<{ slots: Slot[] }>(`/api/manage-availability?token=${encodeURIComponent(token)}`),
  reschedule: (token: string, startUtc: string) => jsonRequest<{ ok: true; meeting: ManagedMeeting }>('/api/manage', {
    method: 'POST',
    body: JSON.stringify({ action: 'reschedule', token, startUtc }),
  }),
  cancelMeeting: (token: string) => jsonRequest<{ ok: true }>('/api/manage', {
    method: 'POST',
    body: JSON.stringify({ action: 'cancel', token }),
  }),
};
