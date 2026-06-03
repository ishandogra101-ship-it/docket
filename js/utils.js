/* ── utils ── pure helpers, zero imports ── */
export const pad = n => String(n).padStart(2, '0');

export const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};

export const shiftStr = (s, n) => {
  const p = s.split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};

export const friendlyDate = s => {
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/* parse a YYYY-MM-DD string into a local Date */
export const parseDate = s => {
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
};

/* weekday index (0=Sun) for a date string */
export const weekday = s => parseDate(s).getDay();

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const uid = () => Date.now() + '_' + Math.random().toString(36).slice(2, 8);
