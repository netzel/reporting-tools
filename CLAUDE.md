# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Waterfall (bridge) Chart Builder: a single-page static app (`index.html`) plus two Vercel serverless functions (`api/`) backed by Neon Postgres and Neon Auth for optional cloud saves. Live at https://reportingtools.vercel.app/ and deployed by Vercel from `main`.

## Commands

There is no build step, bundler, linter or test suite. `package.json` exists only to supply dependencies to the serverless functions.

- **Frontend only:** open `index.html` directly in a browser. Chart.js and the Neon Auth SDK are vendored in `vendor/`, so it works offline. Without the API, `/api/config` fails, the Sign in button stays hidden and saves go to localStorage.
- **With the API:** install with `npm install`, then run through the Vercel CLI (`vercel dev`). This needs the `DATABASE_URL` and `NEON_AUTH_URL` (or `NEON_AUTH_BASE_URL`) env vars.
- **Schema:** run `schema.sql` once in the Neon SQL editor. There are no migrations.

## Architecture

### `index.html` (around 3,400 lines: markup, CSS and one inline `<script>`)
All app logic lives in plain global functions with module-level state (`rows`, `groups`, `tieOutMode`, `plugLabel`, `nextRowId`, `nextGroupId`). It does not use a framework.

- **Data model:** each row is `{id, label, value, type}`, where `type` is one of `positive | negative | anchor | subtotal`. Rows have stable ids so groups (`rowIds: Set<number>`) survive reordering. The row id `-1` is the sentinel for the synthetic tie-out "plug" bar.
- **`compute()`** turns rows into floating bars (`base`, `size`, `raw`). An anchor with no value carries the running total forward. In tie-out mode, `compute()` appends a `plug` bar for the end value minus the running total, plus a final anchor.
- **`updateChart()`** renders with Chart.js. Group brackets are drawn below the axis (`packBrackets`). Edits go through `debounce` / `queueChartUpdate` and do not re-render on every keystroke.
- **State round-trip:** `captureState()` serializes the rows, groups and every style control. It reads most style values straight from DOM inputs by id, so a new control must be added to `captureState`, `sanitizeState` and `applyState` together.
- **`sanitizeState()` is the security chokepoint.** `applyState()` calls it first, so every load path (JSON import, cloud load, local load) is sanitized; don't bypass `applyState` when loading state. Loaded state counts as hostile input: colors must be hex, enums are checked against allowlists (`ROW_TYPES`, `NUM_FORMATS`, `NUM_SCALES`), text is length-capped and unknown fields are dropped. Any new state field must be coerced here. Event handlers attach chart ids as listeners and never interpolate them into inline handlers. See `SECURITY.md`.
- **Storage layer:** `localData` and `cloudData` share one interface (`list / get / save / remove / thumb`), and `dataAPI()` picks one based on `authUser`. `localData` goes through `store`, which uses `window.storage` when it exists (Claude artifacts) and falls back to `localStorage`. Keys are `wf_chart_<id>`, `wf_thumb_<id>` and a save index. Legacy `wf:index` and `chart:<id>` keys are migrated on read.
- **Thumbnails:** a JPEG data URL captured at save time. `backfillThumbnail` regenerates a missing one when a chart is opened. For cloud charts, `list()` returns the thumbnail inline.
- **Auth:** `initAuth()` fetches `/api/config`, creates the Neon Auth client (email OTP or Google) and gets the session. `apiFetch` sends `Authorization: Bearer <token>`. After sign-in the app offers once to import any local charts.
- **Export:** `exportPNG()` draws a composed image (title, subtitle, legend and footnote around the chart canvas). `exportJSON` / `importJSONFile` use a `{app: 'waterfall-chart-builder', state}` wrapper.

### `api/`
- `config.js` exposes only browser-safe config (the auth URL and a boolean `db` flag).
- `charts.js` is one handler that switches on method and `?id=`: GET lists, GET by id loads, POST upserts and DELETE removes. Every query is scoped `where user_id = ${userId}`, and `userId` comes only from `getUserId()`, never from the request. The handler enforces the id regex, the thumbnail data-URL regex, size caps and the limit of 300 charts per user. Keep `SECURITY.md` in sync when you change any of these.
- `_lib/auth.js` verifies a token in one of two ways. A JWT is checked against the JWKS with algorithms pinned to asymmetric ones, trying several candidate JWKS paths. An opaque session token falls back to `GET <base>/get-session` with the Neon session cookie.

### Headers and CSP
`vercel.json` sets the security headers and a CSP. Scripts must stay same-origin, so new libraries go in `vendor/` and not on a CDN. The CSP allows `'unsafe-inline'` because the markup uses inline handlers.

## Roadmap constraint

`BACKLOG.md` lists possible future chart tools. Before a second tool is added to this repo, a landing page or tool switcher has to be built at the root. The waterfall builder would then move to its own path, with a redirect so existing URLs keep working.
