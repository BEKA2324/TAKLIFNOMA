import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { toUTC, localDate } from '../shared/time.ts';
import { loadImage } from '@napi-rs/canvas';
import { calendarDays } from '../frontend/components/date-picker.ts';
const feb = calendarDays(2028, 1);
assert.equal(feb.length, 42);
assert.equal(feb.filter((d) => d.current).length, 29);
assert.equal(feb[0].value, '2028-01-31');
assert.equal(calendarDays(2026, 10)[6].value, '2026-11-01');
const temp = await mkdtemp(join(tmpdir(), 'mehr-test-'));
const port = 31387,
  base = `http://localhost:${port}`;
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL('../backend/server.ts', import.meta.url))],
  {
    cwd: temp,
    env: {
      ...process.env,
      PORT: String(port),
      TELEGRAM_BOT_TOKEN: '',
      ADMIN_TOKEN: 'test-admin-key',
    },
    stdio: 'ignore',
  },
);
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(base + '/api/config');
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  assert(ready, 'Server starts');
  assert.equal((await fetch(base + '/api/admin/stats')).status, 401);
  assert.equal(
    (await fetch(base + '/api/admin/stats', { headers: { authorization: 'Bearer wrong' } })).status,
    401,
  );
  assert.equal((await fetch(base + '/admin')).status, 200);
  assert((await (await fetch(base)).text()).includes('/build/analytics.js'));
  const stats = async () =>
    await (
      await fetch(base + '/api/admin/stats', {
        headers: { authorization: 'Bearer test-admin-key' },
      })
    ).json();
  const event = async (session: string, action: string, cookie = '') =>
    await fetch(base + '/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ session, action }),
    });
  const sessionA = 'a'.repeat(32),
    sessionB = 'b'.repeat(32),
    sessionC = 'c'.repeat(32);
  const firstView = await event(sessionA, 'view');
  const cookie = firstView.headers.get('set-cookie')!.split(';')[0];
  await event(sessionA, 'view', cookie);
  await event(sessionB, 'view', cookie);
  let metrics = await stats();
  assert.equal(metrics.persistent, false);
  assert.equal(metrics.site.visits, 2);
  assert.equal(metrics.site.visitors, 1);
  assert.equal(metrics.site.online, 1);
  assert.equal(metrics.site.todayVisits, 2);
  assert.equal(metrics.site.todayVisitors, 1);
  await event(sessionA, 'leave', cookie);
  assert.equal((await stats()).site.online, 1);
  await event(sessionB, 'leave', cookie);
  assert.equal((await stats()).site.online, 0);
  await event(sessionC, 'view');
  metrics = await stats();
  assert.equal(metrics.site.visitors, 2);
  assert.equal(metrics.site.visits, 3);
  console.log(
    'PASS: private analytics, repeat-view deduplication, multi-tab presence, leave events and distinct visitors.',
  );
  for (const path of ['/', '/build/app.js', '/build/effects.js', '/build/app.css'])
    assert.equal((await fetch(base + path)).status, 200, path);
  const asset = await fetch(base + '/assets/butterfly.glb');
  assert.equal(asset.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(Buffer.from(await asset.arrayBuffer()).toString('ascii', 0, 4), 'glTF');
  const flowers = await fetch(base + '/assets/pink-flowers.jpg');
  assert.equal(flowers.status, 200);
  assert.equal(flowers.headers.get('content-type'), 'image/jpeg');
  const create = async (data: unknown) => {
    const r = await fetch(base + '/api/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { status: r.status, data: await r.json() };
  };
  const apology = {
    type: 'apology',
    sender: 'Aziz',
    recipient: 'Madina',
    title: 'Meni kechira olasanmi?',
    message: 'Seni ranjitganim uchun chin dildan uzr so‘rayman. Hislaring men uchun muhim.',
    date: '',
    place: '',
    timezone: 'Europe/Paris',
    latitude: null,
    longitude: null,
  };
  const a = await create(apology);
  assert.equal(a.status, 201, 'Undated apology');
  const date = toUTC('2030-06-15T19:30', 'Europe/Istanbul');
  assert.equal(date, '2030-06-15T16:30:00.000Z');
  assert.equal(toUTC('2030-06-15T19:30', 'Asia/Kathmandu'), '2030-06-15T13:45:00.000Z');
  assert.equal(localDate(date, 'Europe/Istanbul'), '2030-06-15T19:30');
  assert.throws(() => toUTC('2030-03-10T02:30', 'America/New_York'), 'DST gap');
  const b = await create({
    ...apology,
    type: 'date',
    date,
    place: 'Istanbul, Galata',
    timezone: 'Europe/Istanbul',
    latitude: 41.0256,
    longitude: 28.9741,
  });
  assert.equal(b.status, 201);
  const saved = await (await fetch(base + '/api/invitations/' + b.data.id)).json();
  assert.equal(saved.longitude, 28.9741);
  assert.equal(saved.timezone, 'Europe/Istanbul');
  assert(!saved.secret);
  assert.equal((await create({ ...apology, latitude: 95, longitude: 30 })).status, 400);
  assert.equal((await create({ ...apology, timezone: 'Fake/Zone' })).status, 400);
  assert.equal((await create({ ...apology, type: 'date' })).status, 400);
  await fetch(base + '/api/invitations/' + a.data.id + '/response', {
    method: 'POST',
    body: JSON.stringify({ response: 'no' }),
  });
  assert.equal((await (await fetch(base + '/api/invitations/' + a.data.id)).json()).response, 'no');
  for (const item of [a, b]) {
    const r = await fetch(base + '/api/invitations/' + item.data.id + '/paper.png');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await r.arrayBuffer());
    const image = await loadImage(bytes);
    assert.equal(image.width, 1200);
    assert(image.height >= 1600);
    if (item === a) await writeFile(new URL('../data/preview-paper.png', import.meta.url), bytes);
  }
  console.log(
    'PASS: static assets, undated apology, global coordinates, validation, RSVP, timezone conversion, DST gap, PNG rendering.',
  );
} finally {
  child.kill();
  await new Promise((resolve) => child.once('exit', resolve));
  await rm(temp, { recursive: true, force: true });
}
