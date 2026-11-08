# Laroutine architecture

This document is for contributors. It describes how Laroutine is put together and the rules the code relies on. When you change behavior covered here, update this file in the same change.

Laroutine is a single-user, local-first weekly planner. There is no authentication and no external service: all state lives in one SQLite file.

## 1. Stack

| Piece | Notes |
| --- | --- |
| Next.js (App Router, Server Actions) | `next.config.ts` sets `output: "standalone"` and `serverExternalPackages: ["better-sqlite3"]`. Requires Node.js 22 or newer. |
| React 19 | Server Components read data; Client Components handle interaction. |
| Tailwind CSS v4 | CSS-first configuration in `app/globals.css` (`@theme inline`, no `tailwind.config.js`). Class-based dark mode via `@custom-variant dark`. |
| shadcn/ui + Radix | Primitives live in `components/ui/`. Icons come from `lucide-react` only. |
| next-themes | `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`: exactly two themes, light and dark. |
| better-sqlite3 | Synchronous SQLite driver (native module), used only on the server. |
| zod | Validation schemas shared by client forms and server actions. |
| recharts | The three charts on the metrics page. |
| geist | Geist Sans/Mono fonts bundled through the npm package (no network font fetch at build time). |

There is no ORM, no i18n library and no REST layer.

## 2. Project structure

```
app/
  layout.tsx            Root layout: fonts, ThemeProvider, I18nProvider, sidebar, mobile top bar
  globals.css           Design tokens, Tailwind theme mapping, task card utilities
  page.tsx              Weekly schedule (home)
  metrics/page.tsx      Charts
  categories/page.tsx   Category management
  account/page.tsx      Local profile
  settings/page.tsx     Language, week start, grid of the active workspace
  favicon.ico, icon0.svg, icon1.png, apple-icon.png   Icons (Next file conventions)
  manifest.json         Web app manifest, served at /manifest.json
components/
  ui/                   shadcn primitives (generated; avoid restyling by hand)
  charts/               The three recharts charts and shared chart parts
  app-sidebar.tsx, workspace-switcher.tsx, theme-provider.tsx, theme-toggle.tsx
  schedule-grid.tsx     Grid, day tabs (mobile), dialog state, tooltip provider
  task-card.tsx, task-tooltip.tsx, task-dialog.tsx
  day-picker.tsx, time-select.tsx
  category-form.tsx, categories-manager.tsx, icon-picker.tsx, color-picker.tsx
  settings-form.tsx, profile-form.tsx, profile-avatar.tsx, page-header.tsx
hooks/
  use-mobile.ts         Breakpoint hook used by the shadcn sidebar
lib/
  db.ts                 Database connection and migration runner
  schema.ts             Migrations as TypeScript strings
  types.ts              Shared types and constants (ActionResult, Task, Category, ...)
  validation.ts         zod schemas
  constants.ts          TOOLTIP_DELAY_MS, DEFAULT_GRID
  time.ts               Time formatting and slot helpers
  layout-day.ts         Overlap/lane layout (pure)
  color.ts              Hex/HSV/contrast helpers, categoryColorCss()
  category-icons.ts     Curated lucide icon registry, color-to-CSS helpers
  metrics-format.ts     Formatting helpers for the charts
  utils.ts              shadcn cn()
  queries/              Synchronous reads/writes against SQLite, one file per entity
  actions/              Server Actions ("use server"), one file per entity
  i18n/                 Dictionaries, translate helpers, provider
  *.test.ts             Unit tests (node:test)
scripts/start.mjs       Production start script for the standalone build
public/                 Static assets (web-app-manifest-192x192/512x512.png)
```

The import alias `@/*` maps to the repository root. There is no `src/` directory.

### Pages are dynamic

Pages read SQLite, so `app/layout.tsx` exports `dynamic = "force-dynamic"`. This makes sure `next build` never opens the database (the Docker build has no `/data`). `getDb()` is lazy and runs on first use, never at module import.

## 3. Data model

### Connection and migrations

`lib/db.ts` resolves the database path from `LAROUTINE_DB_PATH` (default `./data/laroutine.db`), creates the directory if needed, opens the file with `PRAGMA foreign_keys = ON` and runs the migrations. The connection is cached on `globalThis` so it survives hot reloads in development. The module imports `server-only`.

The database keeps SQLite's default rollback journal (no WAL), so the persistent state is literally one file. That makes backups a plain file copy.

Migrations are an ordered array of SQL strings in `lib/schema.ts`. Migration `i` is applied while `PRAGMA user_version <= i`; each runs in its own transaction with `foreign_keys` switched off around it, and `PRAGMA foreign_key_check` must come back clean before commit. `user_version` is bumped inside the transaction. The runner is idempotent on every start. The current `user_version` is **4**.

| # | Purpose |
| --- | --- |
| 1 | Full initial schema plus seed rows |
| 2 | Allow 15-minute slots: rebuilds `workspaces` so `slot_minutes IN (15, 30, 60)` |
| 3 | Custom category colors: rebuilds `categories` so `color` may also be a lowercase `#rrggbb` |
| 4 | Time zone setting: `ALTER TABLE settings ADD COLUMN timezone TEXT` (nullable; `NULL` = automatic, the device zone) |

Rules for changing the schema:

- Never edit a migration that has shipped; append a new one.
- SQLite cannot alter a `CHECK`, so constraint changes use the create-new / copy / drop / rename recipe. Carry over ids and the `AUTOINCREMENT` high-water mark (`sqlite_sequence`), and recreate indexes.
- Fresh and upgraded databases must end with the same schema. `lib/schema.test.ts` covers the migrations.
- The schema is a TypeScript string, not a `.sql` file, because Next's standalone file tracing does not copy arbitrary `.sql` files.

### Conventions

- Times are stored as integer minutes since 00:00 (`540` = 09:00).
- Days are `0..6` with `0 = Sunday`, matching `Date#getDay`. The week-start setting only changes display order.
- Tasks cannot span midnight (`end_minute > start_minute`).

### Tables (final shape after migration 4)

- `settings`: exactly one row (`id = 1`): `language` (`pt-BR` or `en`), `week_start` (`sunday` or `monday`), `timezone` (nullable IANA zone; `NULL` = automatic), `active_workspace_id` (nullable, `ON DELETE SET NULL`).
- `profile`: exactly one row (`id = 1`): `display_name`, nullable `avatar_url`.
- `workspaces`: `name` (1 to 60 characters after trimming), `grid_start_hour` (0 to 23, default 6), `grid_end_hour` (1 to 24, default 22, must exceed the start), `slot_minutes` (15, 30 or 60; default 60), `created_at`.
- `categories`: `workspace_id` (cascade), `name` (1 to 40 characters), `icon` (a key of the icon registry in `lib/category-icons.ts`), `color`. `color` accepts `NULL`, one of the preset names (`orange`, `red`, `pink`, `violet`, `blue`, `teal`, `green`, `gray`) or a lowercase `#rrggbb` (the `CHECK` uses case-sensitive `GLOB`). Unique on `(workspace_id, name)` and on `(id, workspace_id)`.
- `tasks`: `workspace_id` (cascade), `category_id`, `name` (1 to 80 characters), nullable `description` and `gif_url`, `start_minute` (0 to 1439), `end_minute` (1 to 1440). A composite foreign key `(category_id, workspace_id)` references `categories(id, workspace_id)`.
- `task_days`: `(task_id, day)` primary key, cascades with the task.
- Indexes on `tasks(workspace_id)` and `categories(workspace_id)`.

Seed (migration 1): one workspace named `Minha rotina` (grid 06:00 to 22:00, 60-minute slots), `settings` (`pt-BR`, Monday, that workspace) and an empty `profile`. No categories or tasks.

### Design notes

- The composite foreign key makes it impossible for a task to use another workspace's category. It uses `ON DELETE NO ACTION` (checked at the end of the statement) rather than `RESTRICT` (immediate), so deleting a workspace can cascade to its tasks before the category rows are checked.
- Deleting a category that still has tasks is refused (`categories.inUse`); nothing is cascaded silently.
- The last remaining workspace cannot be deleted. Deleting another workspace removes its categories, tasks and task days.
- If `settings.active_workspace_id` is `NULL` or dangling, `getActiveWorkspace()` falls back to the lowest workspace id and rewrites the setting.
- The time zone setting only defines what "now" and "today" mean (`nowInZone` in `lib/time.ts`, using `Intl` with `hourCycle: "h23"`; an invalid zone falls back to the device zone). It never shifts task times, which are wall-clock minutes. The zone list on the settings page is built on the server (`Intl.supportedValuesOf("timeZone")` plus `UTC`) and passed as a prop; validation accepts any zone `Intl.DateTimeFormat` accepts.
- Schedule scroll: `ScheduleGrid` computes "now" only on the client, in the configured zone. The mobile day tab uses the same zone. If it is 12:00 or later and the grid spans noon (`gridStartHour < 12 < gridEndHour`), a mount effect scrolls the gutter row marked `data-noon-anchor` (the 12:00 row) to the top of the viewport, inside `requestAnimationFrame` so App Router and scroll restoration cannot override it. Before noon nothing happens. There is no sticky top bar, so no scroll margin is needed.
- Tasks that fall outside a later-narrowed grid are kept in the database, clipped (or hidden when fully outside) in the schedule, and still counted in the metrics.

## 4. Server layout

Reads happen in Server Components through the synchronous functions in `lib/queries/*`. Writes are Server Actions in `lib/actions/*` (`"use server"`). There are no route handlers, so there is one trust boundary and no API contract to maintain.

Every action returns:

```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string>; error?: string }; // values are i18n keys
```

Each action parses its input with the zod schema from `lib/validation.ts` (client forms use the same schemas), runs the database call, calls `revalidatePath("/", "layout")` and returns an `ActionResult`.

| Action file | Functions |
| --- | --- |
| `workspaces.ts` | `createWorkspace(name)` (default grid, becomes active), `setActiveWorkspace(id)`, `deleteWorkspace(id)` |
| `categories.ts` | `createCategory(input)` (returns the new category), `updateCategory(id, input)`, `deleteCategory(id)` |
| `tasks.ts` | `createTask(input)`, `updateTask(id, input)`, `deleteTask(id)` |
| `settings.ts` | `updateSettings({ language, weekStart })`, `updateWorkspaceGrid({ startHour, endHour, slotMinutes })` |
| `profile.ts` | `updateProfile({ displayName, avatarUrl })` |

Workspace-scoped actions read the active workspace on the server (`getActiveWorkspace()`); the client sends a workspace id only for `setActiveWorkspace` and `deleteWorkspace`. Update and delete actions also check that the target row belongs to the active workspace.

Validation rules (mirrored by the zod schemas):

- Task: name required (trimmed, at most 80 characters); at least one day in `0..6`; a category from the active workspace; `endMinute > startMinute`; both times multiples of 15; both within the workspace grid (`validation.outsideGrid` otherwise); `gifUrl` empty or `http(s)://`; an empty description is stored as `NULL`.
- Grid: `endHour > startHour`; `slotMinutes` in `{15, 30, 60}`. Task times are always multiples of 15, independent of the slot interval.
- Category: name required (at most 40 characters); an icon; color `null`, a preset name, or a hex string (`#rgb` or `#rrggbb`, any case) that is normalized to lowercase `#rrggbb`.
- Profile: display name at most 60 characters; `avatarUrl` empty or `http(s)://`.

Metrics (`lib/queries/metrics.ts`): hours count once per task-day and the task count once per task. `getMetrics(workspaceId)` returns hours and task count per category, hours per day (always seven entries, missing days are 0) and the total task count. With no tasks, the metrics page shows a single empty state instead of three empty charts.

Notes:

- Database code is Node-runtime only (never use the edge runtime).
- `lib/db.ts` imports `server-only`; do not import it from Client Components.

## 5. Internationalization

Two languages, `pt-BR` (default) and `en`, without URL locale routing: the language is a persisted setting, not part of the URL.

- `lib/i18n/pt-BR.ts` is the source of truth; its keys define `StringKey`. `lib/i18n/en.ts` must provide every key, which the compiler checks.
- `lib/i18n/index.ts` has `translate`, `makeT` and `intlLocaleOf`. `{name}` placeholders are replaced by simple interpolation; there is no plural library. Unknown key-shaped strings fall back to the generic error message instead of leaking keys.
- `intlLocaleOf` maps `pt-BR` to `pt-BR` and `en` to `en-US`. This is what produces 24-hour time for Portuguese and AM/PM for English.
- The root layout (a Server Component) reads the saved language through `getT()` (`lib/i18n/server.ts`), sets `<html lang>` and wraps the tree in `I18nProvider`. Client components call `useT()` for `t`, `locale` and `intlLocale`.
- Changing the language runs `updateSettings`, which revalidates the layout; everything re-renders with the new dictionary and all time and weekday labels re-format because they derive from `intlLocale`.
- Server action errors are i18n keys, translated where they are displayed.
- The default workspace name is stored as plain text and is not translated afterwards.
- All user-visible strings (including aria-labels, validation errors and chart text) must come from the dictionaries.

## 6. Time handling

`lib/time.ts` is the only place that formats times. Never hand-format a time label.

- `formatMinutes(minutes, intlLocale)` formats with `Intl.DateTimeFormat` in UTC (so DST cannot interfere): 24-hour with two-digit hour for `pt`, 12-hour for English. `1440` renders as midnight, which is fine for an end-of-day label.
- `weekdayLabel(day, intlLocale, "short" | "long")` formats a fixed known Sunday (2024-01-07 UTC) plus `day` days.
- `orderedDays(weekStart)` returns `[1,2,3,4,5,6,0]` for Monday and `[0,...,6]` for Sunday.
- `slotTimes(workspace)` returns slot boundaries from the grid start to the grid end at the slot interval (15, 30 or 60 minutes). The schedule grid uses it for its rows and gutter labels.
- `taskTimes(workspace)` returns every 15 minutes from grid start to grid end (`TASK_STEP_MINUTES = 15`). `time-select` is fed these values so a task can start or end on any quarter hour regardless of the slot interval. If a task's current time is not in the list (for example after the grid changed), the select keeps it available.

`time-select` is a shadcn `Select` rather than `<input type="time">` because the native control follows the operating system locale instead of the app language.

## 7. Schedule layout

### Structure

The number of rows is `(gridEndHour - gridStartHour) * 60 / slotMinutes`. Row height comes from tokens in `app/globals.css`: `--grid-row-h-60` (4rem), `--grid-row-h-30` (2.5rem) and `--grid-row-h-15` (1.75rem). The grid root sets `--grid-row-h` inline from the workspace's slot interval. `ROW_REM` in `schedule-grid.tsx` mirrors these values and must be kept in sync.

Other grid tokens: `--grid-gutter-w`, `--grid-day-min-w`, `--grid-header-h`, `--grid-line`, `--grid-line-strong`, `--grid-header`.

Each day is a `position: relative` column whose height is `rows * row height`, with a repeating background for slot lines (a stronger line each hour). Task cards are absolutely positioned inside the column. Absolute positioning is used because a task can start off-slot after the slot interval changes, and each overlap cluster has its own lane widths, which CSS grid spans cannot express. Empty cells are transparent buttons that open the task dialog prefilled with that day and time. With 15-minute slots only every half hour gets a label in the gutter.

### The algorithm (`lib/layout-day.ts`)

`layoutDay(items)` is a pure function:

1. Sort by `start` ascending, then `end` descending (longer first), then `id` for stability.
2. Sweep to build clusters, the maximal sets of transitively overlapping items. A new cluster starts when `item.start >= clusterEnd`. Touching intervals (`end === next.start`) do not overlap.
3. Inside a cluster, assign lanes greedily: the first lane whose last end is `<= item.start`, otherwise open a new lane.
4. Every item gets `lanes` = the number of lanes in its cluster.

`positionDay(items, { startMin, endMin, slotMinutes })` runs `layoutDay` on the real times, then clips each item to the grid window and computes geometry: `topRows`, `heightRows` (in slot rows), `leftPct = lane / lanes * 100` and `widthPct = 100 / lanes`. Items fully outside the window are dropped from rendering (they stay in the database).

`schedule-grid.tsx` expands each task into one item per day in `task.days`, runs `positionDay` per day and memoizes the result. Cards are inset by `--task-card-gap` (2px).

Unit tests are in `lib/layout-day.test.ts` (no overlap, touching, three-way overlap, chains where the first and last do not overlap, nested tasks, clipped and fully outside tasks).

### Minimum height

The minimum drawn height is `--task-card-min-h` (1rem). That is exactly a 15-minute task on the 60-minute grid, the tightest valid case, so for any task whose duration is a multiple of 15 minutes the drawn height never exceeds its true time span and cards that touch in time never overlap in pixels. Overlap logic always uses real times; only the rendered height has a floor.

### Mobile

Below 768px (`md`) the schedule shows one day at a time with Radix `Tabs` listing the seven days in week-start order. The default tab is today, resolved on the client with `useSyncExternalStore` (the server renders the first day of the week order) to avoid a hydration mismatch. The same column component and layout output are used for the selected day; the time gutter stays. From `md` up all seven columns are shown, and if the container is narrower than the gutter plus seven minimum-width columns the grid area scrolls horizontally with the gutter and header sticky.

## 8. Task cards and tooltip

A card is a real `<button>` (keyboard focusable) with two blocks:

- Icon block (about 20% of the width, floored at `--task-icon-min`, 1.75rem): the category icon on the category color. It never contains text.
- Name block: the task name only, with a line clamp chosen from the card height (1 line when the drawn height is under one slot row or the card is compact, 2 lines under two rows, otherwise 3). Description, GIF and times appear only in the tooltip.

Compact rules (thresholds apply to the drawn height after the 1rem floor):

- Drawn height under 2rem: the compact layout. One truncated line, 10px text, a 12px icon, a 1.25rem icon column and a 1px vertical inset (instead of the 2px gap).
- Drawn height under 2.5rem and the card container narrower than 5rem (many lanes in a small column): the same single-line layout.
- Any card whose container is narrower than 5rem otherwise switches to a stacked layout: a thin icon strip on top (12px icon) and the name below at a smaller size.
- Taller cards use a 16px icon and the 13px/500 name.

Interaction:

- Hover or keyboard focus opens a Radix tooltip after 300 ms (`TOOLTIP_DELAY_MS` in `lib/constants.ts`, mirrored by `--tooltip-delay`). The root layout mounts a `TooltipProvider` with the same delay (used by the sidebar rail tooltips), and the schedule grid mounts its own.
- The tooltip shows, top to bottom and only when filled: the name, the description (preserving line breaks) and the GIF. The GIF is a plain `<img>` (arbitrary remote hosts, so not `next/image`) with `loading="lazy"`, `referrerPolicy="no-referrer"` and a max height from `--tooltip-gif-max-h`; it is hidden if loading fails. The tooltip content is unmounted while closed, so the GIF is fetched on first open. Width is capped by `--tooltip-max-w`.
- Touch devices do not open the tooltip; tapping a card opens the edit dialog.
- Clicking a card opens `TaskDialog` in edit mode. The dialog handles create, edit and delete (with confirmation), and can create a category inline and return to the task form with the entered values preserved. Focus returns to the element that opened it.

## 9. Category colors

`categories.color` is `NULL`, a preset name or a custom lowercase `#rrggbb` (migration 3).

- Presets are CSS variables `--cat-orange`, `--cat-red`, `--cat-pink`, `--cat-violet`, `--cat-blue`, `--cat-teal`, `--cat-green`, `--cat-gray`, tuned per theme (400-level fills in dark mode, 500/600-level in light). `NULL` renders as gray.
- Custom colors render exactly as stored in both themes. The icon color is black or white, whichever has the higher WCAG contrast (`readableForeground` in `lib/color.ts`). Very light or very dark colors get a subtle outline (`COLOR_RING`, 30% of `--foreground`) on tiles, swatches and chart slices; the stored value is never changed.
- `categoryColorCss()` in `lib/color.ts` is the single color-to-CSS helper (cards, lists, selects and charts). Cards receive the color through `--cat`, and custom colors also set `--cat-foreground` and `--cat-ring` inline.
- The color picker offers the presets plus "none", and a custom swatch that opens an inline panel (no popover, so nothing is clipped inside nested dialogs): a saturation/brightness area and hue slider (keyboard accessible, with i18n labels), a hex field (`#rgb` or `#rrggbb`, normalized to lowercase `#rrggbb`) and a live preview on dark and light surfaces using the `.dark` and `.light` token scopes. HSV math is in `lib/color.ts`; there is no color-picker dependency.

## 10. Theming

Dark is the default; a toggle in the sidebar switches between dark and light. Only the `dark` class on `<html>` changes; every component must use semantic tokens (`bg-card`, `text-muted-foreground`, `bg-cat-teal`) rather than raw hex values, so both themes work without per-component overrides.

Tokens live in `app/globals.css`: light values on `:root` (also available as a `.light` scope), dark values on `.dark`, and a `@theme inline` block maps them to Tailwind utilities.

| Role | Dark | Light |
| --- | --- | --- |
| Page background | `#141414` | `#FAFAF9` |
| Surfaces (card, sidebar) | `#1F1F1F` | `#FFFFFF` / `#F4F2EF` |
| Primary action | `#F6820E` on `#1F1F1F` | `#1F1F1F` on `#FAFAF9` |
| Orange used as text (`--highlight`) | `#F6820E` | `#A85200` |
| Ring | `#F6820E` | `#D9700A` |

The brand colors are `#1F1F1F` (primary) and `#F6820E` (secondary). In dark mode the primary is the surface and the secondary is the action color. In light mode the primary becomes the ink and action color, and the secondary orange is replaced by darker oranges (`#A85200` for text, `#D9700A` for accents) so text and focus rings meet WCAG contrast requirements.

The logo is the `Logo` component (`components/logo.tsx`), used in the sidebar header (linking to `/`) and the mobile top bar. It renders both `public/laroutine-black.png` (light theme) and `public/laroutine-white.png` (dark theme) through `next/image`, and Tailwind's `dark:` variant (`.dark` ancestor) shows one and hides the other with `display: none`, so there is no flash or hydration mismatch. Both files are 500x100 (5:1); the displayed height is set by CSS (`h-7` in the sidebar, `h-6` in the top bar). To replace the logo, overwrite the two PNGs with files of the same aspect ratio (or update `WIDTH`/`HEIGHT` in the component).

Sidebar: the desktop sidebar is 15rem wide (`SIDEBAR_WIDTH` in `components/ui/sidebar.tsx`; the mobile drawer is 18rem) and uses shadcn's `collapsible="icon"` mode. A toggle button in the header (also Ctrl/Cmd+B) collapses it to a 3rem icon rail and back. In the rail, nav items show only icons with translated tooltips, the workspace switcher becomes a square with the active workspace's initial (same dropdown, opening to the right), the logo is replaced by the round mark `public/web-app-manifest-192x192.png`, and the footer shows the avatar link and theme toggle stacked. The rail never applies to the mobile drawer. The state is stored in the `sidebar_state` cookie (written by the shadcn provider on each toggle) and read in `app/layout.tsx` with `cookies()` to set `defaultOpen`, so the first paint already has the right state.

Responsive rules: a single structural breakpoint at `md` (768px), matching the shadcn sidebar's mobile switch. Below it the sidebar becomes a drawer opened from a slim top bar and the schedule uses day tabs; forms are single column; the task dialog is near full-screen. Page gutters are 16px (24px from `md`), touch targets are at least 44px on the mobile tabs and day toggles, and there is no horizontal page scroll outside the grid container.

## 11. Testing

Tests use Node's built-in runner: `npm test` runs `node --test lib/*.test.ts`. They cover the layout algorithm, color helpers, the i18n dictionaries, metrics formatting and the schema and migrations. Pure logic belongs in `lib/` so it can be tested without a browser.

Before opening a pull request, run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## 12. Build, standalone output and Docker

- `next build` produces `.next/standalone` (a self-contained server with traced `node_modules`). `next start` does not work with standalone output; `npm start` runs `scripts/start.mjs`, which copies `.next/static` and `public/` next to the standalone server, pins `LAROUTINE_DB_PATH` to an absolute path relative to where you invoked it and starts `server.js`. `PORT` and `HOSTNAME` are honored.
- `better-sqlite3` is a native module. `serverExternalPackages` keeps it out of the bundle; the standalone trace must include its compiled binary (`better_sqlite3.node`).
- The `Dockerfile` is multi-stage on `node:22-bookworm-slim`. The build stage installs `python3 make g++` (used only if no prebuilt `better-sqlite3` binary is available), runs `npm ci` and `npm run build`. The runtime stage copies `.next/standalone`, `.next/static` and `public`, sets `HOSTNAME=0.0.0.0` and `LAROUTINE_DB_PATH=/data/laroutine.db`, declares a single `VOLUME /data` owned by the non-root `node` user, exposes port 3000 and runs `node server.js`. Build and runtime stages must use the same Node major version and libc so the native binary matches; do not build on Debian and run on Alpine.
- `.dockerignore` keeps `node_modules`, build output, local data, documentation and development files out of the build context.
- `docker-compose.yml` builds the image and mounts a named volume at `/data`.
