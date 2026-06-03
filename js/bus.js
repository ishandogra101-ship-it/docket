/* ── bus ── tiny pub/sub so the store can announce changes without knowing
   about the view layer. Breaks the store -> render dependency cycle. ── */
const listeners = {};

export function on(evt, fn) {
  (listeners[evt] || (listeners[evt] = [])).push(fn);
  return () => off(evt, fn);
}

export function off(evt, fn) {
  const arr = listeners[evt];
  if (arr) listeners[evt] = arr.filter(f => f !== fn);
}

export function emit(evt, payload) {
  (listeners[evt] || []).forEach(fn => {
    try { fn(payload); } catch (e) { console.error('[bus]', evt, e); }
  });
}
