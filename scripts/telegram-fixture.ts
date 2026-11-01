// Test-only Telegram transport: no messages leave this process.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { creatorCredit, invitationContent } from '../shared/invitation-content.ts';
import type { InvitationType } from '../shared/types.ts';
let delivered = false;
let photos = 0;
let menuChecked = false;
let choiceChecked = false;
let statsChecked = false;
let idChecked = false;
const expectedTypes: InvitationType[] = ['apology', 'date', 'proposal', 'custom'];
const reply = (result: unknown) =>
  new Response(JSON.stringify({ ok: true, result }), {
    headers: { 'content-type': 'application/json' },
  });
globalThis.fetch = async (url, options) => {
  const method = String(url).split('/').at(-1);
  if (method === 'getMe') return reply({ username: 'mehr_test_bot' });
  if (method === 'getUpdates') {
    if (!delivered) {
      delivered = true;
      const id = process.env.TEST_INVITE!;
      return reply(
        [
          '/start',
          '/id',
          '/stats',
          '/proposal',
          ...[id, ...['0', '1', '2'].map((s) => id.slice(0, -1) + s)].map(
            (code) => '/start ' + code,
          ),
        ].map((text, index) => ({ update_id: index + 1, message: { chat: { id: 12345 }, text } })),
      );
    }
    await new Promise((r) => setTimeout(r, 200));
    return reply([]);
  }
  if (method === 'sendPhoto') {
    const form = options?.body;
    assert(form instanceof FormData);
    assert.equal(form.get('chat_id'), '12345');
    const photo = form.get('photo');
    assert(photo instanceof Blob);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const caption = form.get('caption'),
      markup = form.get('reply_markup');
    assert(typeof caption === 'string' && caption.includes('Madina'));
    assert(caption.includes(creatorCredit));
    const content = invitationContent[expectedTypes[photos]];
    assert(caption.includes(content.label));
    assert(typeof markup === 'string');
    assert(JSON.parse(markup).inline_keyboard[0][0].url.includes('41.02,28.97'));
    assert.equal(JSON.parse(markup).inline_keyboard[0][0].text, '📍 ' + content.mapLabel);
    photos++;
    if (photos < 4) return reply({ message_id: photos + 2 });
    assert(menuChecked && choiceChecked && statsChecked && idChecked);
    assert(process.env.TEST_RECEIPT);
    await writeFile(
      process.env.TEST_RECEIPT,
      'PASS: all four invitation types, type-specific captions/map buttons, BEKA credit, bot menu and proposal link.',
    );
    return reply({ message_id: 2 });
  }
  if (method === 'sendMessage') {
    const data = JSON.parse(String(options?.body));
    if (data.text.includes('Telegram ID: 12345')) idChecked = true;
    if (data.text.includes('Luma statistikasi')) {
      assert(data.text.includes('Bot foydalanuvchilari: 1'));
      statsChecked = true;
    }
    if (data.reply_markup?.inline_keyboard?.length === 3) {
      assert(
        expectedTypes.every((type) =>
          JSON.stringify(data.reply_markup.inline_keyboard).includes(invitationContent[type].menu),
        ),
      );
      assert(data.text.includes(creatorCredit));
      assert.equal(data.reply_markup.inline_keyboard[0][0].text, '🌐 Saytga kirish');
      assert(data.reply_markup.inline_keyboard[0][0].url.startsWith('https://'));
      assert(!data.text.includes('https://'));
      menuChecked = true;
    }
    if (
      data.reply_markup?.inline_keyboard?.length === 1 &&
      data.reply_markup.inline_keyboard[0][0].url.endsWith('?type=proposal')
    ) {
      assert(data.text.includes(invitationContent.proposal.label));
      assert(data.text.includes(creatorCredit));
      assert(!data.text.includes('https://'));
      assert.equal(data.reply_markup.inline_keyboard[0][0].text, '🌐 Saytga kirish');
      choiceChecked = true;
    }
    return reply({ message_id: 3 });
  }
  throw Error('Unexpected Telegram method');
};
