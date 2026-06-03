/* ── reminders ── opt-in browser notifications for tasks due today or
   overdue. Fires at most once per day. No-ops where Notification is
   unsupported (e.g. jsdom) or permission isn't granted. ── */
import { state } from './state.js';
import { todayStr, daysBetween } from './utils.js';

const KEY = 'docket-reminded';
const supported = () => 'Notification' in window;
const label = () => document.getElementById('remind-label');

function dueOrOverdue() {
  const today = todayStr();
  const out = [], seen = {};
  const add = t => { if (!t.done && t.due && daysBetween(today, t.due) <= 0 && !seen[t.id]) { seen[t.id] = true; out.push(t); } };
  Object.values(state.dayCache).forEach(tasks => (tasks || []).forEach(add));
  (state.backlogCache || []).forEach(add);
  return out;
}

export function maybeNotify() {
  if (!supported() || Notification.permission !== 'granted') return;
  const today = todayStr();
  if (localStorage.getItem(KEY) === today) return;     // already notified today
  const tasks = dueOrOverdue();
  if (!tasks.length) return;
  localStorage.setItem(KEY, today);
  const body = tasks.slice(0, 4).map(t => '• ' + t.text).join('\n') +
    (tasks.length > 4 ? `\n…and ${tasks.length - 4} more` : '');
  try {
    new Notification(`Docket — ${tasks.length} task${tasks.length > 1 ? 's' : ''} due`, { body, tag: 'docket-due-' + today });
  } catch (e) { /* some browsers require a SW for Notification ctor; ignore */ }
}

function updateLabel() {
  const l = label(); if (!l) return;
  l.textContent = !supported() ? 'Reminders unavailable'
    : Notification.permission === 'granted' ? 'Reminders on' : 'Enable reminders';
}

export function initReminders() {
  updateLabel();
  const btn = document.getElementById('menu-remind');
  if (btn) btn.addEventListener('click', () => {
    document.getElementById('menu-pop')?.classList.remove('open');
    if (!supported()) return;
    if (Notification.permission === 'granted') { maybeNotify(); return; }
    Notification.requestPermission().then(() => { updateLabel(); maybeNotify(); });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) maybeNotify(); });
  setTimeout(maybeNotify, 4000);          // after first data sync
  setInterval(maybeNotify, 30 * 60 * 1000);
}
