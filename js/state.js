/* ── state ── the app's mutable singletons. Writes that affect the view go
   through setters that emit on the bus, so render stays in sync no matter
   who changed what. ── */
import { emit } from './bus.js';
import { todayStr } from './utils.js';

export const state = {
  dayCache: {},        // { 'YYYY-MM-DD': [tasks] }
  backlogCache: [],    // [items]
  recurringCache: [],  // [recurring templates]
  cur: todayStr(),     // current viewed date
  filter: 'all',       // daily filter: all|pending|done|work|personal|health
  carriedOpen: true,
  expanded: {},        // { taskId|('b_'+id): bool }
  search: '',          // global search query
  showDoneBacklog: false, // completed general tasks hidden by default each load
  loaded: false,
};

export function setCur(s) {
  state.cur = s;
  emit('daily:changed');
}

export function setFilter(f) {
  state.filter = f;
  emit('daily:changed');
}

export function setCarriedOpen(v) {
  state.carriedOpen = v;
  emit('daily:changed');
}

export function toggleExpanded(key) {
  state.expanded[key] = !state.expanded[key];
  // caller decides which area to re-render; emit both is cheap & safe
  emit(key.startsWith('b_') ? 'backlog:changed' : 'daily:changed');
}

export function setSearch(q) {
  state.search = q;
  emit('search:changed');
}

export function setShowDoneBacklog(v) {
  state.showDoneBacklog = v;
  emit('backlog:changed');
}

export function setLoaded(v) { state.loaded = v; }
