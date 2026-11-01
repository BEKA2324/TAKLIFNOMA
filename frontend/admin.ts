import './styles/admin.css';
import { element, query, errorMessage } from './lib/dom.ts';
import type { AnalyticsSummary } from '../shared/analytics.ts';
const form = query<HTMLFormElement>('#admin-login'),
  input = query<HTMLInputElement>('#admin-token'),
  dashboard = element('admin-dashboard'),
  status = element('admin-status');
let token = '';
async function refresh() {
  if (!token) return;
  const requestedToken = token;
  try {
    const response = await fetch('/api/admin/stats', {
      headers: { authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    const data = await response.json();
    if (token !== requestedToken) return;
    if (!response.ok) {
      if (response.status === 401) logout();
      throw Error(data.error || 'Statistika yuklanmadi');
    }
    const stats = data as AnalyticsSummary;
    const previous = stats.previousSnapshot;
    element('previous-counts').hidden = !previous;
    if (previous)
      element('previous-counts').textContent =
        `Ko‘chirishdan oldingi hisob: ${previous.visits} tashrif, ${previous.visitors} brauzer, ${previous.botUsers} bot foydalanuvchisi, ${previous.invitations} taklifnoma va ${previous.subscribers} obunachi. Eski tashriflar jami tashriflarga qo‘shilgan. Noyob brauzer va bot foydalanuvchilari yangi bazaga ulanishdan boshlab alohida sanaladi; eski shaxsiy ID’lar rasmda bo‘lmagani uchun birlashtirilmagan.`;
    const values: Record<string, number> = {
      online: stats.site.online,
      visits: stats.site.visits,
      visitors: stats.site.visitors,
      'today-visits': stats.site.todayVisits,
      'today-visitors': stats.site.todayVisitors,
      invitations: stats.invitations,
      'bot-users': stats.bot.users,
      'bot-today': stats.bot.today,
      'bot-recent': stats.bot.recent,
      'bot-subscribers': stats.bot.subscribers,
    };
    for (const [id, value] of Object.entries(values))
      element(id).textContent = value.toLocaleString('uz-UZ');
    dashboard.hidden = false;
    form.hidden = true;
    status.textContent = 'Yangilandi: ' + new Date(stats.generatedAt).toLocaleTimeString('uz-UZ');
    element('storage-status').textContent = stats.persistent
      ? 'Doimiy baza ulangan — jami tashriflar saqlanadi.'
      : 'Vaqtinchalik baza: hozir yig‘ilmoqda, lekin Render restart/deployida nolga qaytishi mumkin. Doimiy baza hali ulanmagan.';
  } catch (error) {
    status.textContent = errorMessage(error);
  }
}
function logout() {
  token = '';
  input.value = '';
  dashboard.hidden = true;
  form.hidden = false;
  status.textContent = 'Chiqildi.';
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  token = input.value.trim();
  input.value = '';
  void refresh();
});
element('logout').addEventListener('click', logout);
setInterval(() => {
  if (!document.hidden && token) void refresh();
}, 15000);
