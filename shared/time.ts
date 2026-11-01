export function validZone(zone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
export function formatDate(date: string, zone = 'Asia/Tashkent') {
  return date
    ? new Date(date).toLocaleString('uz-UZ', {
        timeZone: zone,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Vaqti kelganda';
}
export function localDate(date: string | number, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(date));
  const p = Object.fromEntries(parts.map((v) => [v.type, v.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function toUTC(wall: string, zone: string) {
  if (!wall) return '';
  const target = Date.parse(wall + 'Z');
  if (!Number.isFinite(target) || !validZone(zone))
    throw new Error('Sana yoki vaqt mintaqasi noto‘g‘ri');
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const instant = target + delta;
    offsets.add(Date.parse(localDate(instant, zone) + 'Z') - instant);
  }
  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter((instant) => localDate(instant, zone) === wall)
    .sort((a, b) => a - b);
  if (!candidates.length)
    throw new Error('Bu vaqt tanlangan mintaqada mavjud emas. Boshqa vaqtni tanlang.');
  return new Date(candidates[0]).toISOString();
}
