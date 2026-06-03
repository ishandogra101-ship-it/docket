/* ── templates ── pure HTML string builders. No DOM, no side effects. ── */
import { esc, friendlyDate } from './utils.js';
import { subState } from './domain.js';
import { state } from './state.js';

function subPanelHTML(t, attrs, addAttrs) {
  let items = '';
  (t.subtasks || []).forEach(s => {
    items += `<div class="sub-item${s.done ? ' sub-done' : ''}">
      <div class="sub-chk${s.done ? ' checked' : ''}" data-action="${attrs.toggle}" data-pid="${t.id}" data-sid="${s.id}"${attrs.extra}></div>
      <span class="sub-txt">${esc(s.text)}</span>
      <button class="sub-del" data-action="${attrs.del}" data-pid="${t.id}" data-sid="${s.id}"${attrs.extra}>✕</button>
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
  const handle = (!isCarried && !t.done) ? `<span class="drag-handle" title="Drag to reorder">⠿</span>` : '';

  return `<div class="task-card${t.done ? ' done-card' : ''}${isCarried ? ' carried-card' : ''}" ${drag} data-id="${t.id}" data-ic="${ic}" data-from="${fs}" data-date="${esc(date)}">
    <div class="task-main-row">
      ${handle}
      <div class="chk ${chkCls}" data-action="toggle" data-id="${t.id}" data-ic="${ic}" data-from="${fs}"></div>
      <div class="task-body-col">
        <div class="task-txt">${esc(t.text)}</div>
        ${isCarried ? `<div class="carried-chip">↗ from ${esc(friendlyDate(from))}</div>` : ''}
        ${t.spawnedFrom ? `<div class="recur-chip">↻ recurring</div>` : ''}
        ${t.note ? `<div class="note-line">${esc(t.note)}</div>` : ''}
        ${progBar(t)}
      </div>
      <div class="task-meta">
        <span class="tag-pill tag-${esc(t.tag)}" data-action="edittag" data-id="${t.id}" data-ic="${ic}" data-from="${fs}" data-date="${esc(date)}" title="Click to edit">${esc(t.tag)}</span>
        <button class="icon-btn expand-btn${isExp ? ' open' : ''}" data-action="expand" data-id="${t.id}" title="Subtasks">${isExp ? '▴' : '▾'}${hasSubs ? ' ' + t.subtasks.length : ''}</button>
        <button class="icon-btn" data-action="edit" data-id="${t.id}" data-ic="${ic}" data-from="${fs}" data-date="${esc(date)}" title="Edit task">✎</button>
        <button class="del-btn" data-action="del" data-id="${t.id}" data-ic="${ic}" data-from="${fs}" title="Delete">✕</button>
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
        <button class="icon-btn" data-action="schedule" data-id="${t.id}" title="Schedule onto a day">📅</button>
        <button class="icon-btn expand-btn${isExp ? ' open' : ''}" data-action="bexpand" data-id="${t.id}">${isExp ? '▴' : '▾'}${hasSubs ? ' ' + t.subtasks.length : ''}</button>
        <button class="icon-btn" data-action="bedit" data-id="${t.id}" title="Edit">✎</button>
        <button class="del-btn" data-action="bdel" data-id="${t.id}">✕</button>
      </div>
    </div>${subHTML}
  </div>`;
}
