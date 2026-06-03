/* ── ui ── chrome: sync indicator, loading, edit modal, confirm dialog,
   undo toast, theme toggle, export/import, schedule picker. Imports the
   store for writes; never imports actions/render (no cycle). ── */
import { on } from './bus.js';
import { state } from './state.js';
import {
  mutateDayTasks, mutateBacklog, deleteBacklogItem, saveBacklogItem, saveRecurring, deleteRecurring,
} from './store.js';
import { todayStr, uid } from './utils.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const $ = id => document.getElementById(id);

/* ── sync status ── */
function setSS(s) {
  const dot = $('sync-dot'), lbl = $('sync-label');
  if (dot) dot.className = 'sync-dot ' + s;
  if (lbl) lbl.textContent = s === 'synced' ? 'Synced' : s === 'syncing' ? 'Syncing…' : s === 'error' ? 'Offline' : 'Connecting…';
}

/* ── theme ── */
const THEME_KEY = 'docket-theme';
function applyTheme(t) {
  document.documentElement.dataset.theme = t === 'dark' ? 'dark' : '';
  const btn = $('theme-btn');
  if (btn) btn.textContent = t === 'dark' ? '☀' : '☾';
}
export function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || '');
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? '' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

/* ── confirm dialog (destructive bulk actions) ── */
let pendingConfirm = null;
export function confirmAction(fn, opts = {}) {
  pendingConfirm = fn;
  if (opts.title) $('confirm-title').textContent = opts.title;
  if (opts.msg) $('confirm-msg').textContent = opts.msg;
  if (opts.btn) $('confirm-yes').textContent = opts.btn;
  $('confirm-overlay').classList.add('open');
}

/* ── undo toast ── */
let toastTimer = null;
export function showUndoToast(msg, undoFn, ms = 5000) {
  const wrap = $('toast-wrap');
  $('toast-msg').textContent = msg;
  wrap.classList.add('show');
  clearTimeout(toastTimer);
  const undoBtn = $('toast-undo');
  const onUndo = () => { clearTimeout(toastTimer); wrap.classList.remove('show'); undoBtn.removeEventListener('click', onUndo); undoFn(); };
  undoBtn.addEventListener('click', onUndo);
  toastTimer = setTimeout(() => { wrap.classList.remove('show'); undoBtn.removeEventListener('click', onUndo); }, ms);
}

/* ── edit modal ── */
let editState = null;   // {type:'day'|'backlog', id, date?}
export function openEdit(type, id, date, text, tag, pri, note) {
  editState = { type, id, date };
  $('edit-text').value = text;
  $('edit-tag').value = tag || 'work';
  $('edit-note').value = note || '';
  $('edit-pri-field').style.display = type === 'backlog' ? 'block' : 'none';
  if (type === 'backlog') $('edit-pri').value = pri || 'medium';
  $('edit-modal').classList.add('open');
  setTimeout(() => $('edit-text').focus(), 120);
}
function saveEdit() {
  if (!editState) return;
  const txt = $('edit-text').value.trim(); if (!txt) return;
  const tag = $('edit-tag').value;
  const note = $('edit-note').value.trim();
  if (editState.type === 'day') {
    mutateDayTasks(editState.date, tasks => tasks.map(t => t.id === editState.id ? { ...t, text: txt, tag, note } : t));
  } else {
    mutateBacklog(editState.id, t => ({ ...t, text: txt, tag, note, priority: $('edit-pri').value }));
  }
  $('edit-modal').classList.remove('open'); editState = null;
}

/* ── schedule a backlog item onto a day ── */
let scheduleId = null;
export function openSchedule(id) {
  const item = state.backlogCache.find(t => t.id === id);
  if (!item) return;
  scheduleId = id;
  $('sched-date').value = todayStr();
  $('sched-name').textContent = item.text;
  $('sched-modal').classList.add('open');
}
function doSchedule() {
  const item = state.backlogCache.find(t => t.id === scheduleId);
  const date = $('sched-date').value;
  if (!item || !date) return;
  // create a day task on the target date, then remove from backlog
  mutateDayTasks(date, tasks => [...tasks, {
    id: uid(), text: item.text, tag: item.tag || 'other', done: false,
    addedOn: date, subtasks: [...(item.subtasks || [])], note: item.note || '', createdAt: Date.now(),
  }]);
  const removed = item;
  deleteBacklogItem(scheduleId);
  $('sched-modal').classList.remove('open');
  showUndoToast('Scheduled for ' + date, () => saveBacklogItem(removed));
  scheduleId = null;
}

/* ── export / import ── */
function exportData() {
  const data = { version: 1, exportedAt: new Date().toISOString(),
    dayTasks: state.dayCache, backlog: state.backlogCache, recurring: state.recurringCache };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'docket-backup-' + todayStr() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch { alert('Invalid backup file.'); return; }
    confirmAction(() => {
      Object.entries(data.dayTasks || {}).forEach(([date, tasks]) => mutateDayTasks(date, () => tasks));
      (data.backlog || []).forEach(item => saveBacklogItem(item));
      (data.recurring || []).forEach(tpl => saveRecurring(tpl));
    }, { title: 'Import backup?', msg: 'This merges the backup into your current tasks and overwrites days that overlap. Export first if unsure.', btn: 'Import' });
  };
  reader.readAsText(file);
}

/* ── recurring tasks modal ── */
function renderRecurList() {
  const list = $('recur-list');
  const items = state.recurringCache || [];
  if (!items.length) { list.innerHTML = '<div class="recur-empty">No recurring tasks yet.</div>'; return; }
  list.innerHTML = items.map(t => {
    const when = t.freq === 'daily' ? 'Daily' : (t.days || []).map(d => DOW[d]).join(' ') || 'Weekly';
    return `<div class="recur-list-item"><span class="recur-when">${when}</span><span class="task-txt">${escHtml(t.text)}</span><button class="del-btn" style="opacity:1" data-recur-del="${t.id}">✕</button></div>`;
  }).join('');
}
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function openRecur() { renderRecurList(); $('recur-modal').classList.add('open'); }
function addRecur() {
  const text = $('recur-text').value.trim(); if (!text) return;
  const freq = $('recur-freq').value;
  const days = freq === 'weekly'
    ? [...document.querySelectorAll('#recur-days .recur-day.on')].map(b => +b.getAttribute('data-d'))
    : [];
  if (freq === 'weekly' && !days.length) { alert('Pick at least one day.'); return; }
  saveRecurring({ id: uid(), text, tag: $('recur-tag').value, freq, days, startDate: todayStr(), createdAt: Date.now() });
  $('recur-text').value = '';
  document.querySelectorAll('#recur-days .recur-day.on').forEach(b => b.classList.remove('on'));
  renderRecurList();
}

/* ── wiring ── */
export function initUI() {
  initTheme();
  setSS('syncing');
  on('sync', setSS);
  on('loaded', () => $('loading').classList.add('hidden'));

  // safety: dismiss loading after 6s even if Firebase never responds
  setTimeout(() => { if (!state.loaded) { state.loaded = true; $('loading').classList.add('hidden'); setSS('error'); } }, 6000);

  // confirm dialog
  const cOverlay = $('confirm-overlay');
  $('confirm-yes').addEventListener('click', () => { cOverlay.classList.remove('open'); if (pendingConfirm) { pendingConfirm(); pendingConfirm = null; } });
  $('confirm-no').addEventListener('click', () => { cOverlay.classList.remove('open'); pendingConfirm = null; });
  cOverlay.addEventListener('click', e => { if (e.target === cOverlay) { cOverlay.classList.remove('open'); pendingConfirm = null; } });

  // edit modal
  const eModal = $('edit-modal');
  $('edit-cancel').addEventListener('click', () => { eModal.classList.remove('open'); editState = null; });
  $('edit-save').addEventListener('click', saveEdit);
  eModal.addEventListener('click', e => { if (e.target === eModal) { eModal.classList.remove('open'); editState = null; } });

  // schedule modal
  const sModal = $('sched-modal');
  $('sched-cancel').addEventListener('click', () => { sModal.classList.remove('open'); scheduleId = null; });
  $('sched-go').addEventListener('click', doSchedule);
  sModal.addEventListener('click', e => { if (e.target === sModal) { sModal.classList.remove('open'); scheduleId = null; } });

  // theme
  $('theme-btn').addEventListener('click', toggleTheme);

  // overflow menu (export/import)
  const menu = $('menu-pop');
  $('menu-btn').addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
  document.addEventListener('click', () => menu.classList.remove('open'));
  menu.addEventListener('click', e => e.stopPropagation());
  $('menu-export').addEventListener('click', () => { exportData(); menu.classList.remove('open'); });
  $('menu-import').addEventListener('click', () => { $('import-file').click(); menu.classList.remove('open'); });
  $('import-file').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
  $('menu-recur').addEventListener('click', () => { openRecur(); menu.classList.remove('open'); });

  // recurring modal
  const rModal = $('recur-modal');
  $('recur-close').addEventListener('click', () => rModal.classList.remove('open'));
  $('recur-add').addEventListener('click', addRecur);
  rModal.addEventListener('click', e => { if (e.target === rModal) rModal.classList.remove('open'); });
  $('recur-freq').addEventListener('change', e => { $('recur-days-field').style.display = e.target.value === 'weekly' ? 'block' : 'none'; });
  $('recur-days').addEventListener('click', e => { const b = e.target.closest('.recur-day'); if (b) b.classList.toggle('on'); });
  $('recur-list').addEventListener('click', e => { const b = e.target.closest('[data-recur-del]'); if (b) { deleteRecurring(b.getAttribute('data-recur-del')); renderRecurList(); } });
  on('recurring:changed', () => { if (rModal.classList.contains('open')) renderRecurList(); });

  // close any overlay on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      eModal.classList.remove('open'); editState = null;
      sModal.classList.remove('open'); scheduleId = null;
      cOverlay.classList.remove('open'); pendingConfirm = null;
      rModal.classList.remove('open');
      menu.classList.remove('open');
    }
  });
}
