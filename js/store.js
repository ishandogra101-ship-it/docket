/* ── store ── Firestore reads/writes + optimistic cache. Emits change events
   on the bus; NEVER imports the view layer. All collection/doc paths go
   through helpers so a future move to users/{uid}/... is a one-file change. ── */
import { db, collection, doc, onSnapshot, setDoc, deleteDoc } from './firebase.js';
import { emit } from './bus.js';
import { state, setLoaded } from './state.js';
import { todayStr } from './utils.js';

/* ── path helpers (prefix is the auth seam) ── */
const PREFIX = '';                       // later: `users/${uid}/`
const dayCol = () => collection(db, PREFIX + 'dayTasks');
const dayDoc = date => doc(db, PREFIX + 'dayTasks', date);
const blCol = () => collection(db, PREFIX + 'backlog');
const blDoc = id => doc(db, PREFIX + 'backlog', String(id));
const recurCol = () => collection(db, PREFIX + 'recurring');
const recurDoc = id => doc(db, PREFIX + 'recurring', String(id));

const setSS = s => emit('sync', s);

/* ── live subscriptions ── */
export function subscribe() {
  onSnapshot(dayCol(), snap => {
    if (snap.metadata.hasPendingWrites) return;   // our own optimistic write echo
    const cache = {};
    snap.forEach(d => { cache[d.id] = d.data().tasks || []; });
    state.dayCache = cache;
    if (!state.loaded) { setLoaded(true); emit('loaded'); setSS('synced'); }
    emit('daily:changed');
  }, () => { setSS('error'); emit('loaded'); });

  onSnapshot(blCol(), snap => {
    if (snap.metadata.hasPendingWrites) return;
    const list = [];
    snap.forEach(d => list.push(d.data()));
    list.sort((a, b) => a.createdAt - b.createdAt);
    state.backlogCache = list;
    emit('backlog:changed');
  }, () => setSS('error'));

  onSnapshot(recurCol(), snap => {
    if (snap.metadata.hasPendingWrites) return;
    const list = [];
    snap.forEach(d => list.push(d.data()));
    state.recurringCache = list;
    emit('recurring:changed');
  }, () => {});
}

/* ── day tasks ── */
export const getDayTasks = date =>
  (state.dayCache[date] || []).map(t => ({ ...t, subtasks: [...(t.subtasks || [])] }));

export function saveDayTasks(date, tasks) {
  state.dayCache[date] = tasks;
  emit('daily:changed');
  setSS('syncing');
  setDoc(dayDoc(date), { tasks })
    .then(() => setSS('synced'))
    .catch(e => { console.error(e); setSS('error'); });
}

export const mutateDayTasks = (date, fn) => saveDayTasks(date, fn(getDayTasks(date)));

/* ── backlog ── */
export function saveBacklogItem(item) {
  // stamp the completion date when it becomes done; clear it when reopened
  if (item.done && !item.completedAt) item.completedAt = todayStr();
  else if (!item.done && item.completedAt) item.completedAt = '';
  const idx = state.backlogCache.findIndex(t => t.id === item.id);
  if (idx >= 0) state.backlogCache[idx] = item; else state.backlogCache.push(item);
  state.backlogCache.sort((a, b) => a.createdAt - b.createdAt);
  emit('backlog:changed');
  setSS('syncing');
  setDoc(blDoc(item.id), item)
    .then(() => setSS('synced'))
    .catch(e => { console.error(e); setSS('error'); });
}

export function deleteBacklogItem(id) {
  state.backlogCache = state.backlogCache.filter(t => t.id !== id);
  emit('backlog:changed');
  setSS('syncing');
  deleteDoc(blDoc(id))
    .then(() => setSS('synced'))
    .catch(e => { console.error(e); setSS('error'); });
}

export const mutateBacklog = (id, fn) => {
  const item = state.backlogCache.find(t => t.id === id);
  if (item) saveBacklogItem(fn({ ...item, subtasks: [...(item.subtasks || [])] }));
};

/* ── recurring templates ── */
export function saveRecurring(item) {
  const idx = state.recurringCache.findIndex(t => t.id === item.id);
  if (idx >= 0) state.recurringCache[idx] = item; else state.recurringCache.push(item);
  emit('recurring:changed');
  setSS('syncing');
  setDoc(recurDoc(item.id), item)
    .then(() => setSS('synced'))
    .catch(e => { console.error(e); setSS('error'); });
}

export function deleteRecurring(id) {
  state.recurringCache = state.recurringCache.filter(t => t.id !== id);
  emit('recurring:changed');
  deleteDoc(recurDoc(id)).catch(e => console.error(e));
}
