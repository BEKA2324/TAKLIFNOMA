import { element, query } from './lib/dom.ts';
import type { ButterflyScene } from './animations/butterflies.ts';
const button = element('butterfly-toggle');
const status = element('butterfly-status');
const host = element('butterfly-layer');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let preference: string | null = null;
try {
  preference = localStorage.getItem('mehr-butterflies');
} catch {}
let enabled = preference ? preference === 'visible' : !motion.matches;
let scene: ButterflyScene | undefined,
  loading = false,
  failed = false;
function paint() {
  host.hidden = !enabled;
  button.setAttribute('aria-pressed', String(enabled));
  query('span', button).textContent = failed
    ? '3D kapalaklar mavjud emas'
    : enabled
      ? 'Kapalaklarni yashirish'
      : 'Kapalaklarni ko‘rsatish';
  button.disabled = failed;
  scene?.setVisible(enabled);
}
async function activate() {
  paint();
  if (!enabled || loading || scene || failed) return;
  loading = true;
  status.textContent = '3D kapalaklar yuklanmoqda…';
  button.setAttribute('aria-busy', 'true');
  try {
    const { createButterflies } = await import('./animations/butterflies.ts');
    scene = await createButterflies(host);
    scene.setVisible(enabled);
    status.textContent = enabled
      ? 'Kapalaklar uchmoqda. Tugma orqali yashirishingiz mumkin.'
      : 'Kapalaklar yashirildi.';
  } catch {
    failed = true;
    enabled = false;
    status.textContent = '3D kapalaklarni yuklab bo‘lmadi. Sahifani qayta ochib ko‘ring.';
    paint();
  } finally {
    loading = false;
    button.removeAttribute('aria-busy');
  }
}
button.addEventListener('click', () => {
  enabled = !enabled;
  preference = enabled ? 'visible' : 'hidden';
  try {
    localStorage.setItem('mehr-butterflies', preference);
  } catch {}
  status.textContent = enabled ? 'Kapalaklar ko‘rsatilmoqda.' : 'Kapalaklar yashirildi.';
  activate();
});
motion.addEventListener('change', () => {
  if (!preference) {
    enabled = !motion.matches;
    activate();
  }
});
window.addEventListener('pagehide', (e) => {
  if (!e.persisted) scene?.dispose();
});
activate();
