/* ── render ── reads state, writes DOM. Subscribed to bus change events in
   main.js. Does not import the store's write functions. ── */
import { state } from './state.js';
import { todayStr, parseDate } from './utils.js';
import { getDayTasks } from './store.js';
import { getCarried, calcXP, calcStreak, generateRecurringFor } from './domain.js';
import { taskCardHTML, backlogCardHTML, emptyIllu } from './templates.js';

const $ = id => document.getElementById(id);
const generated = new Set();   // dates we've already materialized recurring tasks for

export function renderDaily() {
  const d = parseDate(state.cur);
  $('dv-weekday').textContent = d.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase();
  $('dv-day').innerHTML = '<em>' + d.getDate() + '</em>';
  const sub = d.toLocaleDateString('en-IN', { month: 'long' }) + ' ' + d.getFullYear();
  $('dv-month').textContent = state.cur === todayStr() ? 'Today  ·  ' + sub : sub;

  // materialize recurring tasks for this date once per session
  if (!generated.has(state.cur)) { generated.add(state.cur); generateRecurringFor(state.cur); }

  const own = getDayTasks(state.cur);
  const ownIds = {}; own.forEach(t => ownIds[t.id] = true);
  const carried = getCarried().filter(t => !ownIds[t.id]);
  const allT = [...own, ...carried];
  const total = allT.length, done = allT.filter(t => t.done).length;
  const carPending = carried.filter(t => !t.done).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const xp = calcXP(own, carried);
  const streak = calcStreak();

  $('s-total').textContent = total;
  $('s-done').textContent = done;
  $('s-carried').textContent = carPending;
  $('s-pct').textContent = total ? pct + '%' : '—';
  $('prog-fill').style.width = pct + '%';
  $('prog-txt').textContent = total ? done + ' of ' + total + ' complete' : 'No tasks yet';
  $('daily-count').textContent = allT.length;
  $('xp-fill').style.width = xp.pct + '%';
  $('xp-pts').textContent = xp.pts + ' XP';
  const sc = $('streak-chip');
  if (sc) { sc.innerHTML = '🔥 ' + streak + (streak === 1 ? ' day' : ' days'); sc.classList.toggle('cold', streak === 0); }

  const match = t => {
    if (state.filter === 'all') return true;
    if (state.filter === 'done') return t.done;
    if (state.filter === 'pending') return !t.done;
    return t.tag === state.filter;
  };
  const fOwn = own.filter(match);
  const fCar = carried.filter(match);

  let html = '';
  if (!fOwn.length && !fCar.length) {
    html = `<div class="empty-state">${emptyIllu('d')}<div class="empty-msg">Nothing here — add a task above</div></div>`;
  } else {
    if (fOwn.length) {
      html += `<div class="task-list" id="daily-list" style="margin-bottom:${fCar.length ? '14px' : '0'}">`;
      fOwn.forEach(t => { html += taskCardHTML(t, false, ''); });
      html += '</div>';
    }
    if (fCar.length) {
      html += `<div class="carried-hdr" id="car-hdr"><span class="carried-hdr-title">↗ Carried Forward</span><span class="carried-cnt">${fCar.length}</span><span class="carried-arrow${state.carriedOpen ? ' open' : ''}">▾</span></div>`;
      html += `<div class="carried-body${state.carriedOpen ? '' : ' collapsed'}" id="car-body"><div class="task-list" style="margin-top:8px">`;
      fCar.forEach(t => { html += taskCardHTML(t, true, t.carriedFrom || ''); });
      html += '</div></div>';
    }
  }
  $('daily-area').innerHTML = html;
}

export function renderBacklog() {
  const bl = state.backlogCache;
  $('backlog-count').textContent = bl.filter(t => !t.done).length;
  if (!bl.length) {
    $('backlog-area').innerHTML = `<div class="empty-state">${emptyIllu('b')}<div class="empty-msg">No general tasks yet</div></div>`;
    return;
  }
  const priOrder = { high: 0, medium: 1, low: 2 };
  const pending = bl.filter(t => !t.done).sort((a, b) => (priOrder[a.priority || 'medium']) - (priOrder[b.priority || 'medium']));
  const done = bl.filter(t => t.done);
  let html = '';
  pending.forEach(t => { html += backlogCardHTML(t); });
  if (done.length) {
    html += `<div class="sec-head" style="margin-top:18px"><span class="sec-title">Completed</span><div class="sec-line"></div><span class="sec-badge">${done.length}</span></div>`;
    done.forEach(t => { html += backlogCardHTML(t); });
  }
  $('backlog-area').innerHTML = html;
}
