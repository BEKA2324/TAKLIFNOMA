import { mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { InvitationInput, StoredInvitation, ResponseChoice } from '../shared/types.ts';
const dataDirectory = process.env.DATA_DIR || 'data';
await mkdir(dataDirectory, { recursive: true });
export const db = new DatabaseSync(join(dataDirectory, 'mehr.sqlite'));
db.exec(`CREATE TABLE IF NOT EXISTS invitations(id TEXT PRIMARY KEY,secret TEXT,type TEXT,sender TEXT,recipient TEXT,title TEXT,message TEXT,place TEXT,date TEXT,response TEXT);
 CREATE TABLE IF NOT EXISTS subscriptions(invite TEXT,chat TEXT,day_sent INTEGER DEFAULT 0,hour_sent INTEGER DEFAULT 0,UNIQUE(invite,chat));
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);`);
const columns = db
  .prepare('PRAGMA table_info(invitations)')
  .all()
  .map((column) => String(column.name));
for (const [name, kind] of [
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
  ['timezone', "TEXT DEFAULT 'Asia/Tashkent'"],
])
  if (!columns.includes(name)) db.exec(`ALTER TABLE invitations ADD COLUMN ${name} ${kind}`);
const insert = db.prepare(
  'INSERT INTO invitations(id,secret,type,sender,recipient,title,message,place,date,response,latitude,longitude,timezone) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
);
const byId = db.prepare('SELECT * FROM invitations WHERE id=?');
const byCode = db.prepare('SELECT * FROM invitations WHERE secret=? OR id=?');
const response = db.prepare('UPDATE invitations SET response=? WHERE id=?');
export function createInvitation(input: InvitationInput) {
  const id = randomBytes(12).toString('hex'),
    secret = randomBytes(20).toString('hex');
  insert.run(
    id,
    secret,
    input.type,
    input.sender,
    input.recipient,
    input.title,
    input.message,
    input.place,
    input.date,
    'pending',
    input.latitude,
    input.longitude,
    input.timezone,
  );
  return { id, secret };
}
export function findInvitation(id: string): StoredInvitation | undefined {
  return byId.get(id) as unknown as StoredInvitation | undefined;
}
export function findInvitationByCode(code: string): StoredInvitation | undefined {
  return byCode.get(code, code) as unknown as StoredInvitation | undefined;
}
export function setResponse(id: string, value: ResponseChoice) {
  response.run(value, id);
}
