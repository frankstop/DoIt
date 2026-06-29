# DO IT.

DO IT. is a private desktop command center for bills, subscriptions, documents, purchases, warranties, appointments, and follow-up tasks. It keeps deadlines and records on your computer, calculates upcoming obligations, and brings urgent items into one attention queue.

## Features

- Daily dashboard with costs, due dates, appointments, overdue counts, and an attention queue
- Full create, edit, delete, sort, filter, and status workflows for every record type
- Bill payment tracking and 7, 14, and 30-day views
- Subscription monthly and annual cost calculations
- Document location, expiration, and renewal tracking
- Purchase receipt, return-window, and warranty tracking
- Appointment preparation and automatic follow-up task creation
- Linked follow-up tasks with due date and priority filters
- Global search with `Command/Ctrl + K`
- JSON import and export, weekly Markdown summaries, and local backups
- Light and dark desktop themes
- Empty first launch with no preloaded personal data

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- macOS, Windows, or Linux

## Install and run

```bash
npm install
npm run dev
```

The development command starts Vite, compiles the Electron main and preload processes, waits for both, and opens the desktop window.

## Build

```bash
npm run build
```

This type-checks both Electron and React code, then creates the renderer production bundle in `dist/` and Electron process files in `dist-electron/`.

## Package

```bash
npm run package
```

Electron Builder writes platform packages to `release/`. Packaging on the target operating system is recommended. Code signing and notarization are not configured.

## Architecture

```text
src/
  main/       Electron lifecycle, local storage, dialogs, export, import, backup
  preload/    Small context bridge with typed IPC operations
  renderer/   React application, forms, tables, dashboard, search, styles
  shared/     Domain models and IPC contracts
```

The renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and Electron sandboxing enabled. It cannot call Node or Electron APIs directly.

The preload script exposes a small `window.electronAPI` surface. Every persistence or filesystem operation crosses that bridge and is handled in the main process:

- `loadData`
- `saveData`
- `exportJson`
- `importJson`
- `exportWeeklySummary`
- `createBackup`
- `openDataFolder`

## Local data storage

The app uses a JSON database file named `do-it-data.json` inside Electron's platform-specific `userData` directory. Writes use a temporary file followed by a rename to reduce the risk of partial saves.

The first launch creates an empty database. Data is saved after changes and never sent to an external service. Use Settings > Open data folder to inspect the storage directory.

## Import, export, and backup

File operations open native Electron dialogs with the Downloads folder as the default location.

- Export JSON creates a portable copy of all app data.
- Import JSON validates the data structure and replaces the current database after confirmation.
- Weekly summary creates a Markdown file with bills, renewals, documents, appointments, high-priority tasks, subscription cost, and a timestamp.
- Backup creates a timestamped JSON snapshot.

## Screenshots

Add product screenshots under `docs/screenshots/`, then link them here:

```md
![Home dashboard](docs/screenshots/home-dashboard.png)
![Bills in dark mode](docs/screenshots/bills-dark.png)
```

Capture the home dashboard, one populated table, a create/edit form, global search, and dark mode at a desktop window size near 1440 by 960.

## Design reference

The visual system uses the independent [Webflow design analysis from getdesign.md](https://getdesign.md/webflow/design-md) as a starting point. DO IT. is not affiliated with or endorsed by Webflow.
