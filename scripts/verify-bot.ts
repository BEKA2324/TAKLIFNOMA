import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
const temp = await mkdtemp(join(tmpdir(), 'mehr-bot-test-'));
await mkdir(join(temp, 'data'));
const id = 'abcdef123456abcdef123456',
  receipt = join(temp, 'receipt.txt');
const db = new DatabaseSync(join(temp, 'data', 'mehr.sqlite'));
db.exec(
  'CREATE TABLE invitations(id TEXT PRIMARY KEY,secret TEXT,type TEXT,sender TEXT,recipient TEXT,title TEXT,message TEXT,place TEXT,date TEXT,response TEXT,latitude REAL,longitude REAL,timezone TEXT)',
);
db.prepare('INSERT INTO invitations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
  id,
  'secret',
  'apology',
  'Aziz',
  'Madina',
  'Meni kechir',
  'Chin dildan uzr so‘rayman.',
  'Istanbul',
  '',
  'pending',
  41.02,
  28.97,
  'Europe/Istanbul',
);
for (const [suffix, type] of [
  ['0', 'date'],
  ['1', 'proposal'],
  ['2', 'custom'],
]) {
  db.prepare('INSERT INTO invitations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id.slice(0, -1) + suffix,
    'secret-' + type,
    type,
    'Aziz',
    'Madina',
    'Maxsus taklif',
    'Faqat sen uchun.',
    'Istanbul',
    '',
    'pending',
    41.02,
    28.97,
    'Europe/Istanbul',
  );
}
db.close();
const child = spawn(
  process.execPath,
  [
    '--import',
    new URL('./telegram-fixture.ts', import.meta.url).href,
    fileURLToPath(new URL('../backend/server.ts', import.meta.url)),
  ],
  {
    cwd: temp,
    env: {
      ...process.env,
      PORT: '0',
      TELEGRAM_BOT_TOKEN: 'test-only',
      TEST_INVITE: id,
      TEST_RECEIPT: receipt,
    },
    stdio: 'inherit',
  },
);
const exited = new Promise((resolve) => child.once('exit', resolve));
try {
  let result = '';
  for (let i = 0; i < 50; i++) {
    try {
      result = await readFile(receipt, 'utf8');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  if (!result) throw Error('Bot PNG test timed out');
  console.log(result);
} finally {
  child.kill();
  await exited;
  await rm(temp, { recursive: true, force: true });
}
