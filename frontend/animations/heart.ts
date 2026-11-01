import { element as $, query } from '../lib/dom.ts';
interface Particle {
  bx: number;
  by: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}
const canvas = $('heart'),
  ctx = canvas.getContext('2d')!,
  pointer = { x: -999, y: -999 };
let w = 0,
  h = 0,
  points: Particle[] = [];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let animationFrame = 0,
  heartVisible = true;
const coarse = matchMedia('(pointer: coarse)').matches;
function resize() {
  const rect = canvas.getBoundingClientRect();
  w = rect.width;
  h = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  points = [];
  const scale = Math.min(w / 39, h / 34);
  for (let i = 0; i < (coarse ? 1200 : 2400); i++) {
    const t = Math.random() * Math.PI * 2,
      r = Math.sqrt(Math.random());
    const x = 16 * Math.sin(t) ** 3 * r;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r;
    const bx = w / 2 + x * scale,
      by = h / 2 + y * scale;
    points.push({
      bx,
      by,
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      size: Math.random() * 1.5 + 0.45,
      alpha: Math.random() * 0.7 + 0.3,
    });
  }
}
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
});
const resetPointer = () => {
  pointer.x = -999;
  pointer.y = -999;
};
canvas.addEventListener('pointerleave', resetPointer);
canvas.addEventListener('pointerup', resetPointer);
canvas.addEventListener('pointercancel', resetPointer);
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
});
if (coarse)
  query('.heart-caption>span:last-child').textContent = 'Yurakka teging va sehrni kuzating';
function draw(time: number) {
  ctx.clearRect(0, 0, w, h);
  const pulse = reduced ? 1 : 1 + Math.sin(time * 0.0018) * 0.018;
  for (const p of points) {
    const tx = w / 2 + (p.bx - w / 2) * pulse,
      ty = h / 2 + (p.by - h / 2) * pulse;
    let dx = p.x - pointer.x,
      dy = p.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (!reduced && distance < 105) {
      p.vx += (dx / (distance || 1)) * (105 - distance) * 0.028;
      p.vy += (dy / (distance || 1)) * (105 - distance) * 0.028;
    }
    p.vx += (tx - p.x) * 0.025;
    p.vy += (ty - p.y) * 0.025;
    p.vx *= 0.86;
    p.vy *= 0.86;
    p.x += p.vx;
    p.y += p.vy;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,${45 + Math.floor(p.alpha * 35)},${85 + Math.floor(p.alpha * 35)},${p.alpha})`;
    ctx.shadowColor = '#ff285f';
    ctx.shadowBlur = 5;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!reduced && heartVisible && !document.hidden) animationFrame = requestAnimationFrame(draw);
}
function resumeAnimation() {
  cancelAnimationFrame(animationFrame);
  if (heartVisible && !document.hidden) draw(performance.now());
}
new IntersectionObserver(
  (entries) => {
    heartVisible = entries[0].isIntersecting;
    resumeAnimation();
  },
  { threshold: 0 },
).observe(canvas);
document.addEventListener('visibilitychange', resumeAnimation);
new ResizeObserver(() => {
  resize();
  resumeAnimation();
}).observe(canvas);
resize();
resumeAnimation();
