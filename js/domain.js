/* ── domain ── derived data & business logic. Reads cache via the store,
   produces values the view consumes. ── */
import { state } from './state.js';
import { pad, parseDate, weekday, todayStr, daysBetween } from './utils.js';
import { getDayTasks, mutateDayTasks } from './store.js';

/* turn a deadline (YYYY-MM-DD) into a countdown label + severity class.
   Recomputed every render so "days left" stays current. */
export function dueInfo(due) {
  if (!due) return null;
  const days = daysBetween(todayStr(), due);
  if (days < 0) { const n = -days; return { days, cls: 'due-over', label: `${n} day${n > 1 ? 's' : ''} overdue` }; }
  if (days === 0) return { days, cls: 'due-soon', label: 'Due today' };
  if (days === 1) return { days, cls: 'due-soon', label: 'Due tomorrow' };
  if (days <= 3) return { days, cls: 'due-soon', label: `${days} days left` };
  return { days, cls: 'due-future', label: `${days} days left` };
}

/* incomplete tasks from the prior 90 days, surfaced on the current day */
export function getCarried() {
  const seen = {}, carried = [];
  const refD = parseDate(state.cur);
  for (let i = 1; i <= 90; i++) {
    const d = new Date(refD); d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    getDayTasks(ds).forEach(t => {
      if (!t.done && !seen[t.id]) { seen[t.id] = true; carried.push({ ...t, carriedFrom: t.carriedFrom || ds }); }
    });
  }
  return carried;
}

export const subState = t => {
  if (!t.subtasks?.length) return 'none';
  const d = t.subtasks.filter(s => s.done).length;
  return d === 0 ? 'none' : d === t.subtasks.length ? 'all' : 'partial';
};

export function calcXP(own, carried) {
  const all = [...own, ...carried];
  const done = all.filter(t => t.done).length;
  const pts = done * 10;
  const max = Math.max(all.length * 10, 1);
  return { pts, pct: Math.min(Math.round(pts / max * 100), 100) };
}

/* a day "counts" toward a streak if it had tasks and all were done.
   Walk backward from today; stop at the first incomplete day that had tasks.
   Today is only counted once it's fully done, but never breaks the streak. */
export function calcStreak() {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 120; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const tasks = getDayTasks(ds);
    if (!tasks.length) { if (i === 0) continue; else break; }      // empty day: skip today, else end run
    const allDone = tasks.every(t => t.done);
    if (allDone) streak++;
    else if (i === 0) continue;                                    // today still in progress
    else break;
  }
  return streak;
}

/* ── recurring task generation ──
   Materialize due recurring templates into dayTasks for `date`, idempotently.
   A template spawns at most one instance per date (guarded by spawnedFrom). */
export function generateRecurringFor(date) {
  const templates = state.recurringCache || [];
  if (!templates.length) return;
  const dow = weekday(date);
  const existing = getDayTasks(date);
  const have = new Set(existing.map(t => t.spawnedFrom).filter(Boolean));
  const toAdd = [];
  templates.forEach(tpl => {
    if (tpl.startDate && date < tpl.startDate) return;
    const due = tpl.freq === 'daily' || (tpl.freq === 'weekly' && (tpl.days || []).includes(dow));
    if (!due || have.has(tpl.id)) return;
    toAdd.push({
      id: tpl.id + '_' + date,
      text: tpl.text, tag: tpl.tag || 'other', done: false,
      addedOn: date, subtasks: [], note: tpl.note || '',
      spawnedFrom: tpl.id, createdAt: Date.now(),
    });
  });
  if (toAdd.length) mutateDayTasks(date, tasks => [...toAdd, ...tasks]);
}
