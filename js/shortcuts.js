/* ── shortcuts ── global keyboard navigation. Bails while typing so it never
   steals keystrokes from inputs. ── */
import { state, setCur } from './state.js';
import { shiftStr, todayStr } from './utils.js';

export function initShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.target.matches('input, textarea, select');

    // "/" focuses search even while not typing
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('search-inp').focus(); return; }
    if (typing) return;

    switch (e.key) {
      case 't': case 'T': setCur(todayStr()); break;
      case 'ArrowLeft': setCur(shiftStr(state.cur, -1)); break;
      case 'ArrowRight': setCur(shiftStr(state.cur, 1)); break;
      case 'n': case 'N': e.preventDefault(); document.getElementById('d-inp').focus(); break;
      default: return;
    }
  });
}
