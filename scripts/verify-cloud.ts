import assert from 'node:assert/strict';
import { cloudAnalytics, cloudAnalyticsEnabled } from '../backend/analytics-cloud.ts';
const savedUrl = process.env.SUPABASE_URL,
  savedKey = process.env.SUPABASE_SECRET_KEY,
  originalFetch = globalThis.fetch;
try {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_fixture';
  assert(cloudAnalyticsEnabled());
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://example.supabase.co/rest/v1/rpc/luma_analytics');
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('apikey'), 'sb_secret_test_fixture');
    assert.equal(headers.get('authorization'), null);
    const body = JSON.parse(String(options?.body));
    assert.equal(body.p_action, 'view');
    assert.equal(body.p_visitor, 'a'.repeat(32));
    assert.equal(body.p_session, 'b'.repeat(32));
    return new Response(JSON.stringify({ registered: true }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  assert.deepEqual(await cloudAnalytics('view', 'a'.repeat(32), 'b'.repeat(32)), {
    registered: true,
  });
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(() => cloudAnalytics('summary'), /ulanib/);
  console.log(
    'PASS: cloud analytics RPC wiring, server-only key headers and explicit failure handling. Remote SQL still requires a connected Supabase project.',
  );
} finally {
  globalThis.fetch = originalFetch;
  if (savedUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = savedUrl;
  if (savedKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = savedKey;
}
