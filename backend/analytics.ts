import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from './db.ts';
import { ApiError, json, readBody, record } from './http.ts';
import { localDate } from '../shared/time.ts';
import type { AnalyticsSummary } from '../shared/analytics.ts';
import { cloudAnalytics, cloudAnalyticsEnabled } from './analytics-cloud.ts';
import type { CloudSummary } from './analytics-cloud.ts';

db.exec(`CREATE TABLE IF NOT EXISTS analytics_visitors(id TEXT PRIMARY KEY,first_seen INTEGER,last_seen INTEGER);
 CREATE TABLE IF NOT EXISTS analytics_sessions(id TEXT PRIMARY KEY,visitor TEXT,last_seen INTEGER,active INTEGER);
 CREATE INDEX IF NOT EXISTS analytics_presence ON analytics_sessions(active,last_seen);
 CREATE TABLE IF NOT EXISTS analytics_daily(day TEXT PRIMARY KEY,views INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS analytics_visitor_days(day TEXT,visitor TEXT,PRIMARY KEY(day,visitor));
 CREATE TABLE IF NOT EXISTS analytics_bot_users(id TEXT PRIMARY KEY,first_seen INTEGER,last_seen INTEGER);`);
const day = (time: number) => localDate(time, 'Asia/Tashkent').slice(0, 10);
const count = (sql: string, ...params: (string | number)[]) =>
  Number(db.prepare(sql).get(...params)?.n || 0);
export async function recordBotUser(id: number) {
  const now = Date.now();
  db.prepare(
    'INSERT INTO analytics_bot_users VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen',
  ).run(String(id), now, now);
  if (cloudAnalyticsEnabled())
    try {
      await cloudAnalytics('bot', String(id));
    } catch {
      console.error('Bot statistikasi doimiy bazaga yozilmadi.');
    }
}
export async function analyticsSummary(): Promise<AnalyticsSummary> {
  const now = Date.now(),
    today = day(now);
  const summary: AnalyticsSummary = {
    site: {
      visits: count('SELECT SUM(views) n FROM analytics_daily'),
      visitors: count('SELECT COUNT(*) n FROM analytics_visitors'),
      todayVisits: count('SELECT views n FROM analytics_daily WHERE day=?', today),
      todayVisitors: count('SELECT COUNT(*) n FROM analytics_visitor_days WHERE day=?', today),
      online: count(
        'SELECT COUNT(DISTINCT visitor) n FROM analytics_sessions WHERE active=1 AND last_seen>?',
        now - 90000,
      ),
    },
    bot: {
      users: count('SELECT COUNT(*) n FROM analytics_bot_users'),
      today: count(
        'SELECT COUNT(*) n FROM analytics_bot_users WHERE last_seen>=?',
        Date.parse(today + 'T00:00:00+05:00'),
      ),
      recent: count('SELECT COUNT(*) n FROM analytics_bot_users WHERE last_seen>?', now - 86400000),
      subscribers: count('SELECT COUNT(DISTINCT chat) n FROM subscriptions'),
    },
    invitations: count('SELECT COUNT(*) n FROM invitations'),
    generatedAt: new Date(now).toISOString(),
  };
  if (cloudAnalyticsEnabled()) {
    try {
      const remote = await cloudAnalytics<CloudSummary>('summary');
      summary.site = remote.site;
      summary.previousSnapshot = remote.previousSnapshot;
      summary.bot = { ...summary.bot, ...remote.bot };
    } catch {
      throw new ApiError('Doimiy statistika bazasi vaqtincha ishlamayapti', 503);
    }
  }
  summary.persistent =
    cloudAnalyticsEnabled() || Boolean(process.env.ANALYTICS_PERSISTENT_DISK === 'true');
  return summary;
}
function authorized(header: string | undefined) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !header?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7)),
    actual = Buffer.from(expected);
  return supplied.length === actual.length && timingSafeEqual(supplied, actual);
}
let lastCleanup = 0;
export async function handleAnalytics(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method === 'GET' && url.pathname === '/api/admin/stats') {
    if (!process.env.ADMIN_TOKEN) throw new ApiError('ADMIN_TOKEN serverda sozlanmagan', 503);
    if (!authorized(req.headers.authorization)) throw new ApiError('Admin kaliti noto‘g‘ri', 401);
    json(res, 200, await analyticsSummary());
    return true;
  }
  if (req.method !== 'POST' || url.pathname !== '/api/analytics') return false;
  if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)
    throw new ApiError('So‘rov manbasi noto‘g‘ri', 403);
  const body = record(await readBody(req));
  if (
    typeof body.session !== 'string' ||
    !/^[a-f0-9]{32}$/.test(body.session) ||
    !['view', 'heartbeat', 'leave'].includes(String(body.action))
  )
    throw new ApiError('Statistika so‘rovi noto‘g‘ri');
  const now = Date.now(),
    today = day(now);
  let visitor = req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('luma_visitor='))
    ?.slice(13);
  if (!visitor || !/^[a-f0-9]{32}$/.test(visitor)) {
    visitor = randomBytes(16).toString('hex');
    res.setHeader(
      'Set-Cookie',
      `luma_visitor=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`,
    );
  }
  if (body.action === 'view') {
    db.prepare(
      'INSERT INTO analytics_visitors VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen',
    ).run(visitor, now, now);
    const inserted = db
      .prepare('INSERT OR IGNORE INTO analytics_sessions VALUES(?,?,?,1)')
      .run(body.session, visitor, now);
    if (inserted.changes)
      db.prepare(
        'INSERT INTO analytics_daily VALUES(?,1) ON CONFLICT(day) DO UPDATE SET views=views+1',
      ).run(today);
    db.prepare('INSERT OR IGNORE INTO analytics_visitor_days VALUES(?,?)').run(today, visitor);
  }
  db.prepare('UPDATE analytics_sessions SET last_seen=?,active=? WHERE id=? AND visitor=?').run(
    now,
    body.action === 'leave' ? 0 : 1,
    body.session,
    visitor,
  );
  if (now - lastCleanup > 3600000) {
    db.prepare('DELETE FROM analytics_sessions WHERE last_seen<?').run(now - 172800000);
    lastCleanup = now;
  }
  let registered = Boolean(
    count(
      'SELECT COUNT(*) n FROM analytics_sessions WHERE id=? AND visitor=?',
      body.session,
      visitor,
    ),
  );
  if (cloudAnalyticsEnabled()) {
    try {
      const remote = await cloudAnalytics<{ registered: boolean }>(
        body.action as 'view' | 'heartbeat' | 'leave',
        visitor,
        body.session,
      );
      registered = remote.registered;
    } catch {
      throw new ApiError('Tashrifni doimiy bazaga yozib bo‘lmadi', 503);
    }
  }
  json(res, 200, { ok: true, registered });
  return true;
}
