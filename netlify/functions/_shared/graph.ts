const tenant = () => process.env.MS_TENANT_ID || '';
const clientId = () => process.env.MS_CLIENT_ID || '';
const clientSecret = () => process.env.MS_CLIENT_SECRET || '';
export const calendarEmail = () => process.env.MS_CALENDAR_EMAIL || 'ns@iacy.com';
export const crmBccEmail = () => process.env.CRM_BCC_EMAIL || 'crm@iacy.com';

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function graphToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  if (!tenant() || !clientId() || !clientSecret()) throw new Error('Microsoft Graph credentials are not configured');
  const body = new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
  const response = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Could not authenticate with Microsoft');
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

export async function graphFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await graphToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as any)?.error?.message || `Microsoft Graph request failed (${response.status})`);
  return data as T;
}

export async function sendMail(to: string, subject: string, html: string, bcc?: string) {
  const message: any = { subject, body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: to } }] };
  if (bcc) message.bccRecipients = [{ emailAddress: { address: bcc } }];
  await graphFetch(`/users/${encodeURIComponent(calendarEmail())}/sendMail`, { method: 'POST', body: JSON.stringify({ message, saveToSentItems: true }) });
}
