import type { StoredInvitation, InvitationType } from '../shared/types.ts';
import { invitationContent, creatorCredit } from '../shared/invitation-content.ts';
import { formatDate } from '../shared/time.ts';
import { db, findInvitationByCode } from './db.ts';
import { renderPaper } from './card.ts';
import { publicBaseUrl } from './config.ts';
import { recordBotUser, analyticsSummary } from './analytics.ts';
interface BotUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
}
interface Subscription {
  type: InvitationType;
  invite: string;
  chat: string;
  day_sent: number;
  hour_sent: number;
  date: string;
  title: string;
  place: string;
  timezone: string;
}
const token = process.env.TELEGRAM_BOT_TOKEN;
let botName = '';
export function getBotName() {
  return botName;
}
async function telegram<T>(
  method: string,
  data: Record<string, unknown> | FormData = {},
): Promise<T> {
  const multipart = data instanceof FormData;
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: multipart ? {} : { 'content-type': 'application/json' },
    body: multipart ? data : JSON.stringify(data),
    signal: AbortSignal.timeout(35000),
  });
  const result = (await r.json()) as { ok: boolean; result: T };
  if (!result.ok) throw new Error('Telegram request failed');
  return result.result;
}
const send = (chat_id: string | number, text: string) => telegram('sendMessage', { chat_id, text });
async function sendPaper(chat: number, item: StoredInvitation) {
  const content = invitationContent[item.type];
  const form = new FormData();
  form.set('chat_id', String(chat));
  form.set(
    'photo',
    new Blob([new Uint8Array(await renderPaper(item))], { type: 'image/png' }),
    'luma-taklifnoma.png',
  );
  form.set(
    'caption',
    `${content.icon} ${content.label}\n${item.recipient} uchun, ${item.sender}dan.\n${item.date ? formatDate(item.date, item.timezone) + ' · ' + item.timezone + '\n' : ''}Bu maktubni yaqiningizga forward qilishingiz mumkin.\n\n${creatorCredit}`,
  );
  const buttons: { text: string; url: string }[][] = [];
  if (item.latitude !== null)
    buttons.push([
      {
        text: '📍 ' + content.mapLabel,
        url: `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`,
      },
    ]);
  const base = publicBaseUrl();
  if (base.startsWith('https://'))
    buttons.push([
      { text: '💌 Taklifnomani ochish', url: `${base.replace(/\/$/, '')}/?invite=${item.id}` },
    ]);
  if (buttons.length) form.set('reply_markup', JSON.stringify({ inline_keyboard: buttons }));
  await telegram('sendPhoto', form);
}
async function reminders() {
  for (const row of db
    .prepare(
      'SELECT s.*,i.type,i.date,i.title,i.place,i.timezone FROM subscriptions s JOIN invitations i ON i.id=s.invite',
    )
    .all() as unknown as Subscription[]) {
    const left = Date.parse(row.date) - Date.now();
    if (!Number.isFinite(left) || left <= 0) continue;
    const field = left <= 3600000 ? 'hour_sent' : left <= 86400000 ? 'day_sent' : null;
    if (field && !row[field]) {
      try {
        await send(
          row.chat,
          `${invitationContent[row.type].icon} ${invitationContent[row.type].label} — eslatma\n${row.title}\n${formatDate(row.date, row.timezone)} · ${row.timezone}\n📍 ${row.place}\n\n${creatorCredit}`,
        );
        db.prepare(`UPDATE subscriptions SET ${field}=1 WHERE invite=? AND chat=?`).run(
          row.invite,
          row.chat,
        );
      } catch {
        console.error('Obunachiga eslatma yuborilmadi.');
      }
    }
  }
}
export async function runBot() {
  if (!token) return;
  try {
    botName = (await telegram<{ username: string }>('getMe')).username;
  } catch {
    console.error('Bot tokenini yoki internetni tekshiring.');
    return;
  }
  let offset = Number(
    db.prepare("SELECT value FROM settings WHERE key='offset'").get()?.value || 0,
  );
  while (true) {
    try {
      const updates = await telegram<BotUpdate[]>('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      });
      for (const update of updates) {
        try {
          const m = update.message;
          if (m && m.chat.id > 0) recordBotUser(m.chat.id);
          if (m?.text) {
            if (m.text === '/id') {
              await send(m.chat.id, `Telegram ID: ${m.chat.id}\n\n${creatorCredit}`);
              continue;
            }
            if (m.text === '/stats') {
              if (String(m.chat.id) !== process.env.ADMIN_TELEGRAM_ID)
                await send(m.chat.id, 'Statistika faqat sayt egasiga ochiq.');
              else {
                const stats = analyticsSummary();
                await send(
                  m.chat.id,
                  `📊 Luma statistikasi\n\nSaytda hozir: ${stats.site.online}\nJami tashriflar: ${stats.site.visits}\nAlohida brauzerlar: ${stats.site.visitors}\nBugungi tashriflar: ${stats.site.todayVisits}\n\nBot foydalanuvchilari: ${stats.bot.users}\nBotda bugun faol: ${stats.bot.today}\nOxirgi 24 soatda faol: ${stats.bot.recent}\nEslatma obunachilari: ${stats.bot.subscribers}\n\nBotdagi faollik xabarlar bo‘yicha; Telegram onlayn holati emas.\n${creatorCredit}`,
                );
              }
              continue;
            }
            const code = m.text.match(/^\/start(?:@\w+)?\s+([a-f0-9]+)$/)?.[1];
            const item = code ? findInvitationByCode(code) : undefined;
            if (item) {
              await sendPaper(m.chat.id, item);
              if (item.date) {
                db.prepare('INSERT OR IGNORE INTO subscriptions(invite,chat) VALUES(?,?)').run(
                  item.id,
                  String(m.chat.id),
                );
                await send(
                  m.chat.id,
                  `${invitationContent[item.type].icon} ${invitationContent[item.type].label} tayyor! Belgilangan sanadan bir kun va bir soat oldin eslataman.\n/stop — eslatmalarni o‘chirish\n\n${creatorCredit}`,
                );
              }
            } else if (m.text === '/stop') {
              db.prepare('DELETE FROM subscriptions WHERE chat=?').run(String(m.chat.id));
              await send(m.chat.id, 'Eslatmalar o‘chirildi.');
            } else {
              const selected = (Object.keys(invitationContent) as InvitationType[]).find(
                (type) => m.text === invitationContent[type].menu || m.text === '/' + type,
              );
              if (selected) {
                const content = invitationContent[selected];
                const base = publicBaseUrl();
                const link = `${base}/?type=${selected}`;
                await telegram('sendMessage', {
                  chat_id: m.chat.id,
                  text: `${content.icon} ${content.label}\n\nQuyidagi sahifada ism va matnni to‘ldiring. So‘ng “Botdan maktubni olish”ni bosing — shu turdagi PNG maktubni yuboraman.\n\n${link}\n\n${creatorCredit}`,
                  ...(base.startsWith('https://')
                    ? {
                        reply_markup: {
                          inline_keyboard: [[{ text: content.label + ' yaratish ↗', url: link }]],
                        },
                      }
                    : {}),
                });
              } else
                await telegram('sendMessage', {
                  chat_id: m.chat.id,
                  text: `Luma’ga xush kelibsiz 💌\n\nQanday maktub yaratamiz?\n♡ Uchrashuv\n💍 Turmush taklifi\n🌿 Kechirim maktubi\n✦ Boshqa taklifnoma\n\nTurini tanlang, saytda to‘ldiring va botdan qog‘oz maktubni oling.\n/stop — eslatmalarni o‘chirish\n\n${creatorCredit}`,
                  reply_markup: {
                    keyboard: [
                      [
                        { text: invitationContent.date.menu },
                        { text: invitationContent.proposal.menu },
                      ],
                      [
                        { text: invitationContent.apology.menu },
                        { text: invitationContent.custom.menu },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                });
            }
          }
        } catch {
          console.error('Bot xabarini qayta ishlashda xatolik.');
        } finally {
          offset = update.update_id + 1;
          db.prepare("INSERT OR REPLACE INTO settings VALUES('offset',?)").run(String(offset));
        }
      }
      await reminders();
    } catch {
      console.error('Telegram bilan aloqa uzildi. Qayta ulanmoqda.');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
