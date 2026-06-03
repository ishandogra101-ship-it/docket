/* ── main ── entry point. Wires the bus to render, attaches delegated DOM
   listeners, boots the UI and Firestore subscriptions. ── */
import { on } from './bus.js';
import { state, setFilter, setCarriedOpen, toggleExpanded } from './state.js';
import { shiftStr, todayStr } from './utils.js';
import { subscribe } from './store.js';
import { renderDaily, renderBacklog } from './render.js';
import { setCur } from './state.js';
import { initUI } from './ui.js';
import { initSearch, renderSearch } from './search.js';
import { initShortcuts } from './shortcuts.js';
import * as A from './actions.js';

const $ = id => document.getElementById(id);

/* ── bus → view ── */
on('daily:changed', renderDaily);
on('backlog:changed', renderBacklog);
on('search:changed', renderSearch);

/* ── date nav + filters ── */
$('btn-prev').addEventListener('click', () => setCur(shiftStr(state.cur, -1)));
$('btn-next').addEventListener('click', () => setCur(shiftStr(state.cur, 1)));
$('btn-today').addEventListener('click', () => setCur(todayStr()));
document.querySelector('.filter-bar').addEventListener('click', e => {
  const btn = e.target.closest('.fb'); if (!btn) return;
  setFilter(btn.getAttribute('data-f'));
  document.querySelectorAll('.fb').forEach(b => b.classList.toggle('active', b === btn));
});

/* ── add inputs ── */
$('d-add').addEventListener('click', addDailyFromInput);
$('d-inp').addEventListener('keydown', e => { if (e.key === 'Enter') addDailyFromInput(); });
function addDailyFromInput() {
  const inp = $('d-inp');
  A.addDaily(inp.value, $('d-tag').value);
  inp.value = ''; inp.focus();
}
$('b-add').addEventListener('click', addBacklogFromInput);
$('b-inp').addEventListener('keydown', e => { if (e.key === 'Enter') addBacklogFromInput(); });
function addBacklogFromInput() {
  const inp = $('b-inp');
  A.addBacklog(inp.value, $('b-tag').value, $('b-pri').value);
  inp.value = ''; inp.focus();
}

/* ── daily area: clicks + subtask enter + drag-and-drop ── */
const dailyArea = $('daily-area');
dailyArea.addEventListener('click', e => {
  if (e.target.closest('#car-hdr')) { setCarriedOpen(!state.carriedOpen); return; }
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');
  const pid = el.getAttribute('data-pid');
  const isC = el.getAttribute('data-ic') === '1';
  const from = el.getAttribute('data-from') || '';
  const sid = el.getAttribute('data-sid');

  if (a === 'toggle') A.toggleDaily(id, isC, from);
  else if (a === 'del') A.delDaily(id, isC, from);
  else if (a === 'expand') toggleExpanded(id);
  else if (a === 'edit' || a === 'edittag') A.editDaily(id, isC, from);
  else if (a === 'tsub') A.toggleSubDaily(pid, sid, isC, from);
  else if (a === 'dsub') A.delSubDaily(pid, sid, isC, from);
  else if (a === 'asub') {
    const inp = el.closest('.sub-panel')?.querySelector('.sub-inp');
    if (inp) { A.addSubDaily(pid, isC, from, inp.value); inp.value = ''; }
  }
});
dailyArea.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const inp = e.target.closest('.sub-inp'); if (!inp) return;
  A.addSubDaily(inp.getAttribute('data-pid'), inp.getAttribute('data-ic') === '1', inp.getAttribute('data-from') || '', inp.value);
  inp.value = '';
});

/* drag-and-drop reorder (own daily tasks only) */
let dragId = null;
dailyArea.addEventListener('dragstart', e => {
  const card = e.target.closest('.task-card[draggable="true"]'); if (!card) return;
  dragId = card.getAttribute('data-id'); card.classList.add('dragging');
});
dailyArea.addEventListener('dragend', e => {
  e.target.closest('.task-card')?.classList.remove('dragging');
  dailyArea.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
  dragId = null;
});
dailyArea.addEventListener('dragover', e => {
  const card = e.target.closest('.task-card[draggable="true"]'); if (!card || !dragId) return;
  e.preventDefault();
  dailyArea.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
  if (card.getAttribute('data-id') !== dragId) card.classList.add('drag-over');
});
dailyArea.addEventListener('drop', e => {
  const card = e.target.closest('.task-card[draggable="true"]'); if (!card || !dragId) return;
  e.preventDefault();
  const toId = card.getAttribute('data-id');
  if (toId !== dragId) A.reorderDaily(dragId, toId);
});

/* ── backlog area: clicks + subtask enter ── */
const backlogArea = $('backlog-area');
backlogArea.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');
  const pid = el.getAttribute('data-pid');
  const sid = el.getAttribute('data-sid');

  if (a === 'btoggle') A.toggleBacklog(id);
  else if (a === 'bdel') A.delBacklog(id);
  else if (a === 'bexpand') toggleExpanded('b_' + id);
  else if (a === 'bedit') A.editBacklog(id);
  else if (a === 'schedule') A.scheduleBacklog(id);
  else if (a === 'editpri') A.cyclePri(id);
  else if (a === 'btsub') A.toggleSubBacklog(pid, sid);
  else if (a === 'bdsub') A.delSubBacklog(pid, sid);
  else if (a === 'basub') {
    const inp = el.closest('.sub-panel')?.querySelector('.sub-inp');
    if (inp) { A.addSubBacklog(pid, inp.value); inp.value = ''; }
  }
});
backlogArea.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const inp = e.target.closest('.sub-inp'); if (!inp) return;
  const pid = inp.getAttribute('data-bpid');
  if (pid) { A.addSubBacklog(pid, inp.value); inp.value = ''; }
});

/* ── boot ── */
initUI();
initSearch();
initShortcuts();
renderDaily();
renderBacklog();
subscribe();
