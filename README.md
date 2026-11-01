# FlowTask

A polished, AI-era task-management frontend — projects, tasks, a Kanban board, a calendar, an inbox, and a simulated AI assistant. Built as a **frontend-only prototype** with realistic mock data.

## Getting started

```bash
npm install
npm run dev        # start the dev server (default http://localhost:5173)
npm run build      # type-check and build for production
npm run preview    # serve the production build locally
```

## What's inside

- **Overview** — workload snapshot, today's focus, project progress.
- **Tasks** — list, Kanban board (drag between columns, or use each card's "Move to" menu), and month/week calendar. Full create/edit/complete/delete flows.
- **Projects** — cards with progress, members, and target dates; create, edit, cycle status, archive/restore.
- **Inbox** — activity feed with unread tracking and mark-all-read.
- **Ask FlowTask AI** — a **simulated** assistant that drafts suggested tasks from your workspace; review, pick, and add them.
- **Command palette** (`Ctrl/⌘ K`), AI drawer (`Ctrl/⌘ J`), new task (`N`), light/dark/system themes.

## Important limitations

- **No backend.** All data lives in in-memory mock modules and resets on a full page reload.
- **No real AI.** The assistant is a deterministic local simulation — no model, no API keys, nothing leaves the browser.
- **No auth.** The profile in Settings is a local demo identity; only harmless UI preferences (theme, sidebar state, profile) are persisted to `localStorage`.
- Every visible control is functional or explicitly labelled as coming soon.

## Tech

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Radix primitives · Zustand · React Router · date-fns · lucide-react.

See `../FlowTask_Frontend_Design_Spec.md` for the full product specification.
