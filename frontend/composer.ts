import { formatDate, localDate, toUTC } from '../shared/time.ts';
import { setupMap } from './components/map.ts';
import { setupDatePicker } from './components/date-picker.ts';
import { element as $, query, errorMessage } from './lib/dom.ts';
import type {
  InvitationType,
  LocationSelection,
  BotConfig,
  Invitation,
  CreatedInvitation,
  InvitationInput,
} from '../shared/types.ts';
let type: InvitationType = 'date',
  inviteId: string | null = null,
  botName = '',
  coords: LocationSelection | null = null;
const fields = ['sender', 'recipient', 'title', 'message', 'date', 'place'] as const;
const zone = $('timezone');
const zones = Intl.supportedValuesOf
  ? Intl.supportedValuesOf('timeZone')
  : [
      'Asia/Tashkent',
      'Europe/London',
      'Europe/Paris',
      'Europe/Istanbul',
      'Asia/Dubai',
      'America/New_York',
    ];
const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tashkent';
for (const name of new Set(['Asia/Tashkent', deviceZone, ...zones])) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name.replaceAll('_', ' ');
  zone.append(option);
}
zone.value = deviceZone;
const datePicker = setupDatePicker($('date'), zone);
const defaults = {
  date: [
    'Men bilan uchrashuvga chiqasanmi?',
    'Bir oqshom, ikki finjon qahva va sen bilan cheksiz suhbat. Bu lahzani birga yarataylik.',
  ],
  proposal: [
    'Menga turmushga chiqasanmi?',
    'Eng go‘zal kunlarim sen bilan. Hikoyamizning keyingi sahifasini birga yozamizmi?',
  ],
  apology: [
    'Meni kechira olasanmi?',
    'Seni ranjitganim uchun chin dildan uzr so‘rayman. Hislaring men uchun muhim. Xatoyimni tushunib, uni tuzatishni istayman. Tayyor bo‘lganingda seni tinglashga tayyorman.',
  ],
  custom: [
    'Bu kunni birga nishonlaymizmi?',
    'Hayotimdagi quvonchli lahzada yonimda bo‘lishingni istayman. Seni kutaman!',
  ],
};
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data as T;
}
function render() {
  datePicker.refresh();
  $('for-you').textContent = $('recipient').value
    ? `${$('recipient').value.toUpperCase()}, FAQAT SEN UCHUN`
    : 'FAQAT SEN UCHUN';
  $('preview-title').textContent = $('title').value;
  $('preview-message').textContent = $('message').value;
  $('preview-place').textContent = '⌖ ' + ($('place').value || 'Bizning sevimli joyimiz');
  $('preview-place').hidden = type === 'apology' && !$('place').value;
  try {
    $('preview-date').textContent = $('date').value
      ? '♡ ' +
        formatDate(toUTC($('date').value, zone.value), zone.value) +
        ' · ' +
        zone.value.replaceAll('_', ' ')
      : '♡ Unutilmas bir kun';
  } catch {
    $('preview-date').textContent = 'Sanani tekshiring';
  }
  $('preview-date').hidden = type === 'apology' && !$('date').value;
  query('.details').hidden = $('preview-place').hidden && $('preview-date').hidden;
  $('signature').textContent = 'Mehr bilan, ' + ($('sender').value || 'sizdan');
  $('proposal-image').hidden = type !== 'proposal';
  query('.mini-heart').hidden = type === 'proposal';
  query('.mini-heart').textContent = type === 'apology' ? '❀' : '♥';
  $('card').classList.toggle('apology', type === 'apology');
  $('date').required = type !== 'apology';
  $('place').required = type !== 'apology';
  $('date-hint').textContent = type === 'apology' ? '(ixtiyoriy)' : '(tanlangan mintaqa vaqti)';
  $('yes').textContent = type === 'apology' ? 'Suhbatlashamiz ♡' : 'Ha, albatta! ♡';
  $('no').textContent = type === 'apology' ? 'Menga vaqt kerak' : 'Boshqa safar';
  $('map-link').hidden = !coords;
  if (coords)
    $('map-link').href =
      `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}
function invalidate() {
  if (!$('result').hidden) {
    $('result').hidden = true;
    $('status').textContent = 'O‘zgarishlarni ulashish uchun taklifnomani qayta yarating.';
  }
  if (!inviteId) {
    $('telegram').hidden = true;
    $('bot-note').hidden = true;
  }
}
fields.forEach((id) =>
  $(id).addEventListener('input', () => {
    invalidate();
    render();
  }),
);
zone.addEventListener('change', () => {
  invalidate();
  render();
});
document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach((button) => {
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  button.addEventListener('click', () => {
    type = button.dataset.type as InvitationType;
    document.querySelectorAll('[data-type]').forEach((b) => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    [$('title').value, $('message').value] = defaults[type];
    invalidate();
    render();
  });
});
setupMap((selection) => {
  coords = selection;
  if (selection && !$('place').value)
    $('place').value = selection.name || `${selection.lat.toFixed(5)}, ${selection.lng.toFixed(5)}`;
  invalidate();
  render();
});
function botLink(code: string, creator = false) {
  if (botName) {
    const href = `https://t.me/${botName}?start=${code}`;
    $('telegram').href = href;
    $('telegram').hidden = false;
    if (creator) {
      $('creator-bot').href = href;
      $('creator-bot').hidden = false;
    }
  } else {
    $('bot-note').hidden = false;
    $('bot-note').textContent =
      'Botga ulanish hozir mavjud emas. PNG rasmni yuklab olib yuborishingiz mumkin.';
  }
}
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.submitter as HTMLButtonElement;
  button.disabled = true;
  $('status').textContent = 'Maktub tayyorlanmoqda…';
  try {
    const data = Object.fromEntries(
      fields.map((id) => [id, $(id).value.trim()]),
    ) as unknown as InvitationInput;
    data.type = type;
    data.timezone = zone.value;
    data.date = toUTC(data.date, zone.value);
    data.latitude = coords?.lat ?? null;
    data.longitude = coords?.lng ?? null;
    const result = await request<CreatedInvitation>('/api/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const link = new URL(location.href);
    link.search = '';
    link.hash = '';
    link.searchParams.set('invite', result.id);
    $('share-url').value = link.href;
    $('open-invite').href = link.href;
    $('download-paper').href = `/api/invitations/${result.id}/paper.png`;
    $('download-paper').hidden = false;
    $('result').hidden = false;
    ({ botName } = await request<BotConfig>('/api/config'));
    botLink(result.secret, true);
    $('status').textContent = 'Tayyor! Botdan qog‘oz maktubingizni oling yoki havolani ulashing.';
    $('result').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'nearest',
    });
  } catch (error) {
    $('status').textContent = errorMessage(error);
  } finally {
    button.disabled = false;
  }
});
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('share-url').value);
    $('status').textContent = 'Havola nusxalandi.';
  } catch {
    $('share-url').select();
    $('status').textContent = 'Havolani tanlab nusxalang.';
  }
});
for (const response of ['yes', 'no'])
  $(response).addEventListener('click', async () => {
    if (!inviteId) {
      $('answer-status').textContent = 'Bu jonli ko‘rinish. Avval maktub yarating.';
      return;
    }
    try {
      await request(`/api/invitations/${inviteId}/response`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      $('answer-status').textContent =
        response === 'yes'
          ? type === 'apology'
            ? 'Javobingiz saqlandi: suhbatlashamiz ♡'
            : 'Yana bir chiroyli hikoya boshlandi! ♡'
          : type === 'apology'
            ? 'Javobingiz saqlandi: menga vaqt kerak.'
            : 'Javobingiz saqlandi. Balki boshqa safar.';
    } catch (e) {
      $('answer-status').textContent = errorMessage(e);
    }
  });
async function init() {
  const params = new URLSearchParams(location.search);
  const requestedType = params.get('type');
  if (
    !params.has('invite') &&
    requestedType &&
    ['date', 'proposal', 'apology', 'custom'].includes(requestedType)
  ) {
    document.querySelector<HTMLButtonElement>(`[data-type="${requestedType}"]`)?.click();
  }
  try {
    ({ botName } = await request<BotConfig>('/api/config'));
    inviteId = new URLSearchParams(location.search).get('invite');
    if (inviteId) {
      document.body.classList.add('guest');
      const data = await request<Invitation>('/api/invitations/' + encodeURIComponent(inviteId));
      type = data.type;
      zone.value = data.timezone || 'Asia/Tashkent';
      fields.forEach(
        (id) =>
          ($(id).value =
            id === 'date' ? (data.date ? localDate(data.date, zone.value) : '') : data[id]),
      );
      coords =
        data.latitude != null && data.longitude != null
          ? { lat: data.latitude, lng: data.longitude }
          : null;
      render();
      botLink(inviteId);
      if (data.response !== 'pending')
        $('answer-status').textContent =
          'Javob: ' + (data.response === 'yes' ? $('yes').textContent : $('no').textContent);
    }
  } catch (e) {
    $('answer-status').textContent = errorMessage(e);
  }
}
render();
init();
