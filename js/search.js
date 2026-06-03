/* ── search ── global text search across all loaded days + backlog. Results
   are locator rows: click to jump to the task's day (daily) or the general
   list (backlog). Pure-client over the cache. ── */
import { state, setCur, setSearch } from './state.js';
import { esc, friendlyDate } from './utils.js';
import { emptyIllu } from './templates.js';

const $ = id => document.getElementById(id);

function matches(q, t) { return (t.text || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q); }

function rowHTML(t, where, jump) {
  return `<div class="task-card" data-jump="${esc(jump)}" style="cursor:pointer">
    <div class="task-main-row">
      <div class="task-body-col">
        <div class="task-txt">${esc(t.text)}</div>
        ${t.note ? `<div class="note-line">${esc(t.note)}</div>` : ''}
      </div>
      <div class="task-meta"><span class="tag-pill tag-${esc(t.tag)}">${esc(t.tag)}</span><span class="carried-chip">${esc(where)}</span></div>
    </div>`;
}

export function renderSearch() {
  const q = state.search.trim().toLowerCase();
  const results = $('search-results');
  const workspace = $('workspace');
  if (!q) { results.style.display = 'none'; results.innerHTML = ''; workspace.style.display = ''; return; }

  workspace.style.display = 'none';
  results.style.display = 'block';

  const dayHits = [];
  Object.entries(state.dayCache).forEach(([date, tasks]) =>
    (tasks || []).forEach(t => { if (matches(q, t)) dayHits.push({ t, date }); }));
  dayHits.sort((a, b) => b.date.localeCompare(a.date));
  const blHits = (state.backlogCache || []).filter(t => matches(q, t));

  let html = '';
  if (!dayHits.length && !blHits.length) {
    html = `<div class="empty-state">${emptyIllu('s')}<div class="empty-msg">No matches for “${esc(state.search)}”</div></div>`;
  } else {
    if (dayHits.length) {
      html += `<div class="sec-head"><span class="sec-title">Daily · ${dayHits.length}</span><div class="sec-line"></div></div><div class="task-list">`;
      dayHits.forEach(({ t, date }) => { html += rowHTML(t, friendlyDate(date) + (t.done ? ' · done' : ''), 'day:' + date); });
      html += '</div>';
    }
    if (blHits.length) {
      html += `<div class="sec-head"><span class="sec-title">General · ${blHits.length}</span><div class="sec-line"></div></div><div class="task-list">`;
      blHits.forEach(t => { html += rowHTML(t, 'general' + (t.done ? ' · done' : ''), 'backlog'); });
      html += '</div>';
    }
  }
  results.innerHTML = html;
}

export function initSearch() {
  const inp = $('search-inp');
  inp.addEventListener('input', () => setSearch(inp.value));
  $('search-results').addEventListener('click', e => {
    const card = e.target.closest('[data-jump]'); if (!card) return;
    const jump = card.getAttribute('data-jump');
    inp.value = ''; setSearch('');
    if (jump.startsWith('day:')) setCur(jump.slice(4));
    else document.querySelector('.section-divider')?.scrollIntoView({ behavior: 'smooth' });
  });
}
