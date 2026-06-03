# Docket

A calm, paper-textured personal task manager. Plan your day, carry forward
what you didn't finish, keep a separate list of undated "general" tasks, and
stay motivated with XP and streaks. Data syncs in real time through Firebase
Firestore and works offline.

> Built as a **buildless** app — native ES modules, no bundler, no `npm install`.
> Just static files served over HTTP.

## Features

- **Daily tasks** with categories (work / personal / health / other) and a
  filter bar (all / pending / done / by category).
- **Carried-forward** — incomplete tasks from earlier days automatically surface
  on the current day in a collapsible section.
- **General tasks** — an undated backlog with high / medium / low priority.
- **Subtasks** with progress bars; a task auto-completes when all subtasks do.
- **Notes** on any task.
- **Deadlines** on daily *and* general tasks, with a live colour-coded "days left"
  countdown ("Due today", "N days left", "N days overdue"); set/change/clear from the
  edit modal. General tasks sort by soonest deadline, and an **Overdue** filter surfaces
  late daily tasks.
- **Week strip** — a 7-day navigator showing each day's task count + deadline markers;
  click to jump.
- **Reminders** — opt-in browser notifications for tasks due today/overdue.
- **Schedule** a general task onto a specific day (📅).
- **Recurring tasks** — daily or specific weekdays; instances are generated
  per day, idempotently.
- **XP + streaks** — daily XP bar plus a 🔥 streak of consecutive fully-completed days.
- **Global search** ( `/` ) across every day and the backlog, with jump-to-day.
- **Dark mode** ( ☾ / ☀ ), remembered across sessions.
- **Undo** on delete via a toast — no more confirm-every-time friction.
- **Drag-and-drop** reordering of the day's own tasks.
- **Export / Import** your whole dataset as JSON.
- **Keyboard shortcuts** — see below.
- **Offline-first** via Firestore's persistent on-device cache.
- **Responsive** — a two-column workspace on desktop that collapses to a single
  column on tablet/mobile.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `t` | Jump to today |
| `←` / `→` | Previous / next day |
| `n` | Focus the "add task" input |
| `Esc` | Close any open dialog/menu |

## Running locally

ES modules and Firebase both require `http://` (not `file://`), so serve the
folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

The app talks to a live Firebase project. If Firebase can't be reached, a 6-second
safety timeout dismisses the loading screen and the sync indicator turns to
"Offline".

## Project structure

```
index.html        # markup only
css/docket.css    # all styles + the dark theme + responsive layout
js/
  firebase.js     # the ONLY file importing the Firebase CDN (pinned 12.14.0)
  bus.js          # tiny pub/sub event bus
  state.js        # app state + setters that emit change events
  utils.js        # pure date/string helpers
  store.js        # Firestore reads/writes, optimistic cache, path helpers
  domain.js       # derived logic: carried tasks, XP, streaks, recurring generator
  templates.js    # pure HTML string builders for task cards
  render.js       # reads state -> writes DOM (subscribes to the bus)
  ui.js           # modals, toast, theme, export/import, recurring, sync indicator
  actions.js      # task operations (add/toggle/delete/reorder/schedule …)
  search.js       # global search view
  shortcuts.js    # keyboard navigation
  main.js         # wiring + boot
```

### Architecture notes

- **No build step.** Every relative import includes the `.js` extension because
  native ES modules don't resolve extensions. All Firebase sub-packages share one
  pinned version, imported only from `js/firebase.js`.
- **One-way data flow.** Writes go through `store.js`, which updates an optimistic
  in-memory cache and `emit`s a change event on the bus. `render.js` subscribes and
  redraws. The store never imports the view, so there's no dependency cycle.
- **Optimistic + offline.** Local edits render immediately; Firestore confirms in the
  background. Snapshot echoes of our own writes are ignored via
  `snapshot.metadata.hasPendingWrites`, which is robust with the on-device cache.

### Data model (Firestore)

| Collection | Doc id | Shape |
| --- | --- | --- |
| `dayTasks` | `YYYY-MM-DD` | `{ tasks: [ { id, text, tag, done, subtasks[], note, due, addedOn, createdAt, spawnedFrom? } ] }` |
| `backlog` | task id | `{ id, text, tag, priority, done, subtasks[], note, due, createdAt }` |
| `recurring` | template id | `{ id, text, tag, freq:'daily'\|'weekly', days:[0-6], startDate, createdAt }` |

> **Auth is deferred but designed for.** Today the data is a single shared dataset.
> All Firestore paths are built behind helpers in `store.js` (via a `PREFIX`
> constant), so moving to per-user `users/{uid}/…` collections later is a one-file
> change.
