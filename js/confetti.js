/* ── confetti ── tiny celebratory burst fired when a task is completed.
   Uses the Web Animations API; degrades gracefully where it's unavailable
   (e.g. jsdom) and respects prefers-reduced-motion. ── */
const COLORS = ['#6366f1', '#a855f7', '#f43f5e', '#10b981', '#fbbf24', '#0ea5e9'];

export function burst(x, y) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const n = 18;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.background = COLORS[i % COLORS.length];
    if (i % 3 === 0) p.style.borderRadius = '50%';
    document.body.appendChild(p);

    if (typeof p.animate !== 'function') { p.remove(); continue; }
    const ang = Math.PI * 2 * (i / n) + Math.random() * 0.6;
    const dist = 55 + Math.random() * 75;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 30;
    const rot = (Math.random() * 720 - 360) + 'deg';
    const anim = p.animate([
      { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy + 140}px) rotate(${rot}) scale(.3)`, opacity: 0 },
    ], { duration: 750 + Math.random() * 350, easing: 'cubic-bezier(.2,.65,.4,1)' });
    anim.onfinish = () => p.remove();
  }
}
