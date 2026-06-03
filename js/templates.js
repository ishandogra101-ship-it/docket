/* ── templates ── pure HTML string builders. No DOM, no side effects. ── */
import { esc, friendlyDate } from './utils.js';
import { subState } from './domain.js';
import { state } from './state.js';

/* ── inline icon set (stroke style) ── */
const I = {
  grip: '<svg width="14" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.7"/><circle cx="15" cy="5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="19" r="1.7"/><circle cx="15" cy="19" r="1.7"/></svg>',
  chev: '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  pencil: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  xs: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  cal: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  arrow: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  recur: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
};

/* friendly empty-state illustration: clipboard + gradient check badge */
export const emptyIllu = (id = 'e') => `<svg class="empty-illu" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="eg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
  <rect x="26" y="22" width="68" height="84" rx="13" fill="var(--surface)" stroke="var(--border2)" stroke-width="3"/>
  <rect x="45" y="13" width="30" height="17" rx="7" fill="url(#eg-${id})"/>
  <path d="M40 52h30M40 68h42M40 84h22" stroke="var(--ink5)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="90" cy="88" r="19" fill="url(#eg-${id})"/>
  <path d="M81 88l6 6 11-12" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function subPanelHTML(t, attrs, addAttrs) {
  let items = '';
  (t.subtasks || []).forEach(s => {
    items += `<div class="sub-item${s.done ? ' sub-done' : ''}">
      <div class="sub-chk${s.done ? ' checked' : ''}" data-action="${attrs.toggle}" data-pid="${t.id}" data-sid="${s.id}"${attrs.extra}></div>
      <span class="sub-txt">${esc(s.text)}</span>
      <button class="sub-del" data-action="${attrs.del}" data-pid="${t.id}" data-sid="${s.id}"${attrs.extra}>${I.xs}</button>
    </div>`;
  });
  return `<div class="sub-panel open">
    <div class="sub-add-row">
      <input class="sub-inp" ${addAttrs} placeholder="Add subtask…">
      <button class="sub-add-btn" data-action="${attrs.add}" data-pid="${t.id}"${attrs.extra}>+ Add</button>
    </div>${items}</div>`;
}

function progBar(t) {
  if (!(t.subtasks?.length > 0)) return '';
  const doneSubs = t.subtasks.filter(s => s.done).length;
  const pct = Math.round(doneSubs / t.subtasks.length * 100);
  return `<div class="sub-prog-wrap"><div class="sub-prog-bar"><div class="sub-prog-fill${pct === 100 ? ' full' : ''}" style="width:${pct}%"></div></div><span class="sub-prog-label">${doneSubs}/${t.subtasks.length}</span></div>`;
}

export function taskCardHTML(t, isCarried, from) {
  const ic = isCarried ? '1' : '0', fs = esc(from || '');
  const ss = subState(t);
  const chkCls = t.done ? 'checked' : (ss === 'partial' ? 'partial' : '');
  const hasSubs = t.subtasks?.length > 0;
  const isExp = !!state.expanded[t.id];
  const date = isCarried ? from : state.cur;
  const extra = ` data-ic="${ic}" data-from="${fs}"`;

  const subHTML = isExp
    ? subPanelHTML(t,
        { toggle: 'tsub', del: 'dsub', add: 'asub', extra },
        `data-pid="${t.id}" data-ic="${ic}" data-from="${fs}"`)
    : '';

  /* own (non-carried, non-done) tasks are reorderable via drag handle */
  const drag = (!isCarried && !t.done) ? `draggable="true"` : '';
  const handle = (!isCarried && !t.done) ? `<span class="drag-handle" title="Drag to reorder">${I.grip}</span>` : '';

  return `<div class="task-card${t.done ? ' done-card' : ''}${isCarried ? ' carried-card' : ''}" ${drag} data-id="${t.id}" data-ic="${ic}" data-from="${fs}" data-date="${esc(date)}">
    <div class="task-main-row">
      ${handle}
      <div class="chk ${chkCls}" data-action="toggle" data-id="${t.id}" data-ic="${ic}" data-from="${fs}"></div>
      <div class="task-body-col">
        <div class="task-txt">${esc(t.text)}</div>
        ${isCarried ? `<div class="carried-chip">${I.arrow} from ${esc(friendlyDate(from))}</div>` : ''}
        ${t.spawnedFrom ? `<div class="recur-chip">${I.recur} recurring</div>` : ''}
        ${t.note ? `<div class="note-line">${esc(t.note)}</div>` : ''}
        ${progBar(t)}
      </div>
      <div class="task-meta">
        <span class="tag-pill tag-${esc(t.tag)}" data-action="edittag" data-id="${t.id}" data-ic="${ic}" data-from="${fs}" data-date="${esc(date)}" title="Click to edit">${esc(t.tag)}</span>
        <button class="icon-btn expand-btn${isExp ? ' open' : ''}" data-action="expand" data-id="${t.id}" title="Subtasks">${I.chev}${hasSubs ? `<span class="sub-count">${t.subtasks.length}</span>` : ''}</button>
        <button class="icon-btn" data-action="edit" data-id="${t.id}" data-ic="${ic}" data-from="${fs}" data-date="${esc(date)}" title="Edit task">${I.pencil}</button>
        <button class="del-btn" data-action="del" data-id="${t.id}" data-ic="${ic}" data-from="${fs}" title="Delete">${I.x}</button>
      </div>
    </div>${subHTML}
  </div>`;
}

export function backlogCardHTML(t) {
  const ss = subState(t);
  const chkCls = t.done ? 'checked' : (ss === 'partial' ? 'partial' : '');
  const hasSubs = t.subtasks?.length > 0;
  const isExp = !!state.expanded['b_' + t.id];
  const pri = t.priority || 'medium';

  const subHTML = isExp
    ? subPanelHTML(t,
        { toggle: 'btsub', del: 'bdsub', add: 'basub', extra: '' },
        `data-bpid="${t.id}"`)
    : '';

  return `<div class="backlog-card p-${pri}${t.done ? ' b-done' : ''}" data-bid="${t.id}">
    <div class="pri-banner"></div>
    <div class="backlog-task-row">
      <div class="chk ${chkCls}" data-action="btoggle" data-id="${t.id}"></div>
      <div class="task-body-col">
        <div class="task-txt">${esc(t.text)}</div>
        ${t.note ? `<div class="note-line">${esc(t.note)}</div>` : ''}
        ${progBar(t)}
      </div>
      <div class="task-meta">
        <span class="tag-pill tag-${esc(t.tag)}">${esc(t.tag)}</span>
        <span class="pri-badge pri-${pri}" data-action="editpri" data-id="${t.id}" title="Click to change priority">${pri}</span>
        <button class="icon-btn" data-action="schedule" data-id="${t.id}" title="Schedule onto a day">${I.cal}</button>
        <button class="icon-btn expand-btn${isExp ? ' open' : ''}" data-action="bexpand" data-id="${t.id}" title="Subtasks">${I.chev}${hasSubs ? `<span class="sub-count">${t.subtasks.length}</span>` : ''}</button>
        <button class="icon-btn" data-action="bedit" data-id="${t.id}" title="Edit">${I.pencil}</button>
        <button class="del-btn" data-action="bdel" data-id="${t.id}">${I.x}</button>
      </div>
    </div>${subHTML}
  </div>`;
}
