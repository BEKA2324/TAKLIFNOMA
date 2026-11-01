import { query, errorMessage } from '../lib/dom.ts';
import { localDate, toUTC, formatDate } from '../../shared/time.ts';
export function calendarDays(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(Date.UTC(year, month, 1 - offset + i));
    return {
      value: day.toISOString().slice(0, 10),
      day: day.getUTCDate(),
      current: day.getUTCMonth() === month,
    };
  });
}
export function setupDatePicker(input: HTMLInputElement, zone: HTMLSelectElement) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'date-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'date-dialog');
  input.before(trigger);
  input.hidden = true;
  input.tabIndex = -1;
  const dialog = document.createElement('dialog');
  dialog.id = 'date-dialog';
  dialog.className = 'date-dialog';
  dialog.setAttribute('aria-labelledby', 'date-dialog-title');
  dialog.innerHTML = `<div class="date-dialog-head"><div><span class="date-kicker">UNUTILMAS LAHZANI TANLANG</span><h2 id="date-dialog-title">Qachon ko‘rishamiz?</h2></div><button type="button" class="date-close" aria-label="Yopish">×</button></div><div class="date-month-nav"><button type="button" class="date-prev" aria-label="Oldingi oy">‹</button><h3 class="date-month" aria-live="polite"></h3><button type="button" class="date-next" aria-label="Keyingi oy">›</button></div><div class="date-week" aria-hidden="true"><span>Du</span><span>Se</span><span>Ch</span><span>Pa</span><span>Ju</span><span>Sh</span><span>Ya</span></div><div class="date-grid" role="group" aria-label="Kunni tanlang"></div><div class="date-time"><div><span class="date-time-title">Uchrashuv vaqti</span><span class="date-zone"></span></div><div class="date-clock"><label><span class="sr-only">Soat</span><input class="date-hour" type="number" min="0" max="23" step="1" inputmode="numeric" aria-label="Soat"></label><span>:</span><label><span class="sr-only">Daqiqa</span><input class="date-minute" type="number" min="0" max="59" step="1" inputmode="numeric" aria-label="Daqiqa"></label></div></div><p class="date-error" role="status"></p><div class="date-actions"><button type="button" class="date-clear">Tozalash</button><button type="button" class="date-today">Bugun</button><button type="button" class="date-apply">Tanlash ↗</button></div>`;
  document.body.append(dialog);
  const q = <T extends HTMLElement = HTMLElement>(s: string) => query<T>(s, dialog),
    grid = q('.date-grid');
  let selected = '',
    year = 0,
    month = 0,
    today = '';
  function refresh() {
    trigger.replaceChildren();
    const icon = document.createElement('span');
    icon.textContent = '▦';
    icon.className = 'date-icon';
    const text = document.createElement('span');
    try {
      text.textContent = input.value
        ? formatDate(toUTC(input.value, zone.value), zone.value)
        : 'Sana va vaqtni tanlang';
    } catch {
      text.textContent = 'Sana va vaqtni qayta tanlang';
    }
    trigger.append(icon, text);
    trigger.classList.toggle('has-date', Boolean(input.value));
    trigger.setAttribute('aria-label', 'Uchrashuv sanasi: ' + text.textContent);
  }
  function paint() {
    q('.date-month').textContent = new Date(Date.UTC(year, month, 1)).toLocaleDateString('uz-UZ', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    q('.date-zone').textContent = zone.value.replaceAll('_', ' ');
    grid.replaceChildren();
    for (const day of calendarDays(year, month)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(day.day);
      button.dataset.value = day.value;
      button.className = 'date-day';
      button.classList.toggle('other-month', !day.current);
      button.classList.toggle('selected', selected === day.value);
      button.classList.toggle('today', today === day.value);
      button.disabled = day.value < today;
      button.setAttribute(
        'aria-label',
        new Date(day.value + 'T12:00:00Z').toLocaleDateString('uz-UZ', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      );
      button.setAttribute('aria-pressed', String(selected === day.value));
      if (day.value === today) button.setAttribute('aria-current', 'date');
      button.addEventListener('click', () => {
        selected = day.value;
        year = Number(selected.slice(0, 4));
        month = Number(selected.slice(5, 7)) - 1;
        q('.date-error').textContent = '';
        paint();
        grid.querySelector<HTMLElement>(`[data-value="${selected}"]`)?.focus();
      });
      button.addEventListener('keydown', (e) => {
        const offsets: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -7,
          ArrowDown: 7,
        };
        if (!(e.key in offsets)) return;
        e.preventDefault();
        const next = new Date(day.value + 'T12:00:00Z');
        next.setUTCDate(next.getUTCDate() + offsets[e.key]);
        const value = next.toISOString().slice(0, 10);
        if (value < today) return;
        year = next.getUTCFullYear();
        month = next.getUTCMonth();
        paint();
        grid.querySelector<HTMLElement>(`[data-value="${value}"]`)?.focus();
      });
      grid.append(button);
    }
  }
  function open() {
    today = localDate(Date.now(), zone.value).slice(0, 10);
    const initial = input.value || localDate(Date.now() + 3600000, zone.value);
    selected = initial.slice(0, 10);
    year = Number(selected.slice(0, 4));
    month = Number(selected.slice(5, 7)) - 1;
    q<HTMLInputElement>('.date-hour').value = initial.slice(11, 13);
    q<HTMLInputElement>('.date-minute').value = initial.slice(14, 16);
    q('.date-error').textContent = '';
    paint();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() =>
      grid.querySelector<HTMLElement>(`[data-value="${selected}"]`)?.focus(),
    );
  }
  function commit(value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    refresh();
    dialog.close();
    trigger.focus();
  }
  trigger.addEventListener('click', open);
  input.addEventListener('invalid', (e) => {
    e.preventDefault();
    open();
  });
  input.addEventListener('input', refresh);
  zone.addEventListener('change', refresh);
  q('.date-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      dialog.close();
  });
  function moveMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    paint();
  }
  q('.date-prev').addEventListener('click', () => moveMonth(-1));
  q('.date-next').addEventListener('click', () => moveMonth(1));
  q('.date-today').addEventListener('click', () => {
    selected = today;
    year = Number(today.slice(0, 4));
    month = Number(today.slice(5, 7)) - 1;
    paint();
  });
  q('.date-clear').addEventListener('click', () => commit(''));
  q('.date-apply').addEventListener('click', () => {
    const hour = q<HTMLInputElement>('.date-hour'),
      minute = q<HTMLInputElement>('.date-minute');
    if (!hour.value || !minute.value || !hour.checkValidity() || !minute.checkValidity()) {
      q('.date-error').textContent = 'Soat 0–23, daqiqa 0–59 oralig‘ida bo‘lsin.';
      return;
    }
    const value = `${selected}T${hour.value.padStart(2, '0')}:${minute.value.padStart(2, '0')}`;
    try {
      if (Date.parse(toUTC(value, zone.value)) <= Date.now())
        throw Error('Kelajakdagi sana va vaqtni tanlang.');
      commit(value);
    } catch (error) {
      q('.date-error').textContent = errorMessage(error);
    }
  });
  refresh();
  return { refresh };
}
