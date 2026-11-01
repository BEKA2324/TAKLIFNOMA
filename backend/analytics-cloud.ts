import type { AnalyticsSummary } from '../shared/analytics.ts';
export function cloudAnalyticsEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
export interface CloudSummary {
  previousSnapshot?: AnalyticsSummary['previousSnapshot'];
  site: AnalyticsSummary['site'];
  bot: Pick<AnalyticsSummary['bot'], 'users' | 'today' | 'recent'>;
}
export async function cloudAnalytics<T = unknown>(
  action: 'view' | 'heartbeat' | 'leave' | 'bot' | 'summary',
  visitor = '',
  session = '',
): Promise<T> {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Doimiy statistika bazasi sozlanmagan');
  const result = await fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/luma_analytics', {
    method: 'POST',
    headers: {
      apikey: key,
      ...(key.startsWith('eyJ') ? { authorization: 'Bearer ' + key } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_action: action, p_visitor: visitor, p_session: session }),
    signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) throw new Error('Doimiy statistika bazasiga ulanib bo‘lmadi');
  return (await result.json()) as T;
}
