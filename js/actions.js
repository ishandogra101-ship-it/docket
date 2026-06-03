/* ── actions ── the operations layer invoked by event handlers. Wraps the
   store with task semantics (subtask gating, undo-on-delete, priority cycle). ── */
import { state } from './state.js';
import { uid } from './utils.js';
import {
  getDayTasks, mutateDayTasks, mutateBacklog, deleteBacklogItem, saveBacklogItem,
} from './store.js';
import { showUndoToast, openEdit, openSchedule } from './ui.js';

/* ── daily ── */
export function addDaily(text, tag) {
  const txt = text.trim(); if (!txt) return;
  const tasks = getDayTasks(state.cur);
  tasks.push({ id: uid(), text: txt, tag, done: false, addedOn: state.cur, subtasks: [], note: '', due: '', createdAt: Date.now() });
  mutateDayTasks(state.cur, () => tasks);
}
export function toggleDaily(id, isC, from) {
  mutateDayTasks(isC ? from : state.cur, tasks => tasks.map(t => {
    if (t.id !== id) return t;
    if (t.subtasks?.length && !t.subtasks.every(s => s.done)) { alert('Complete all subtasks first.'); return t; }
    return { ...t, done: !t.done };
  }));
}
export function delDaily(id, isC, from) {
  const date = isC ? from : state.cur;
  const task = getDayTasks(date).find(t => t.id === id);
  if (!task) return;
  mutateDayTasks(date, tasks => tasks.filter(t => t.id !== id));
  showUndoToast('Task deleted', () => mutateDayTasks(date, tasks => [...tasks, task]));
}
export function reorderDaily(fromId, toId) {
  mutateDayTasks(state.cur, tasks => {
    const arr = [...tasks];
    const fi = arr.findIndex(t => t.id === fromId);
    const ti = arr.findIndex(t => t.id === toId);
    if (fi < 0 || ti < 0 || fi === ti) return tasks;
    const [moved] = arr.splice(fi, 1);
    arr.splice(ti, 0, moved);
    return arr;
  });
}
export function addSubDaily(pid, isC, from, text) {
  if (!text.trim()) return;
  mutateDayTasks(isC ? from : state.cur, tasks => tasks.map(t => t.id !== pid ? t : { ...t, subtasks: [...(t.subtasks || []), { id: uid(), text: text.trim(), done: false }], done: false }));
}
export function toggleSubDaily(pid, sid, isC, from) {
  mutateDayTasks(isC ? from : state.cur, tasks => tasks.map(t => {
    if (t.id !== pid) return t;
    const subs = (t.subtasks || []).map(s => s.id === sid ? { ...s, done: !s.done } : s);
    return { ...t, subtasks: subs, done: subs.length > 0 && subs.every(s => s.done) };
  }));
}
export function delSubDaily(pid, sid, isC, from) {
  mutateDayTasks(isC ? from : state.cur, tasks => tasks.map(t => t.id !== pid ? t : { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== sid) }));
}
export function editDaily(id, isC, from) {
  const date = isC ? from : state.cur;
  const task = getDayTasks(date).find(t => t.id === id);
  if (task) openEdit('day', id, date, task.text, task.tag, null, task.note, task.due);
}

/* ── backlog ── */
export function addBacklog(text, tag, priority) {
  const txt = text.trim(); if (!txt) return;
  saveBacklogItem({ id: uid(), text: txt, tag, priority, done: false, subtasks: [], note: '', due: '', createdAt: Date.now() });
}
export function toggleBacklog(id) {
  mutateBacklog(id, t => {
    if (t.subtasks?.length && !t.subtasks.every(s => s.done)) { alert('Complete all subtasks first.'); return t; }
    return { ...t, done: !t.done };
  });
}
export function delBacklog(id) {
  const item = state.backlogCache.find(t => t.id === id);
  if (!item) return;
  deleteBacklogItem(id);
  showUndoToast('Task deleted', () => saveBacklogItem(item));
}
export function addSubBacklog(pid, text) {
  if (!text.trim()) return;
  mutateBacklog(pid, t => ({ ...t, subtasks: [...(t.subtasks || []), { id: uid(), text: text.trim(), done: false }], done: false }));
}
export function toggleSubBacklog(pid, sid) {
  mutateBacklog(pid, t => {
    const subs = (t.subtasks || []).map(s => s.id === sid ? { ...s, done: !s.done } : s);
    return { ...t, subtasks: subs, done: subs.length > 0 && subs.every(s => s.done) };
  });
}
export function delSubBacklog(pid, sid) {
  mutateBacklog(pid, t => ({ ...t, subtasks: (t.subtasks || []).filter(s => s.id !== sid) }));
}
export function editBacklog(id) {
  const item = state.backlogCache.find(t => t.id === id);
  if (item) openEdit('backlog', id, null, item.text, item.tag, item.priority, item.note, item.due);
}
export function scheduleBacklog(id) { openSchedule(id); }

const priCycle = { high: 'medium', medium: 'low', low: 'high' };
export function cyclePri(id) {
  mutateBacklog(id, t => ({ ...t, priority: priCycle[t.priority || 'medium'] }));
}
