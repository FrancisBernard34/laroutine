// Schema as ordered TS strings (not a .sql file: Next standalone tracing does not
// copy arbitrary .sql files). Migration i is applied while PRAGMA user_version <= i.
// Never edit an applied migration; append a new one.

export const DEFAULT_WORKSPACE_NAME = "Minha rotina";

const M1_INITIAL = `
CREATE TABLE workspaces (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  grid_start_hour  INTEGER NOT NULL DEFAULT 6  CHECK (grid_start_hour BETWEEN 0 AND 23),
  grid_end_hour    INTEGER NOT NULL DEFAULT 22 CHECK (grid_end_hour BETWEEN 1 AND 24),
  slot_minutes     INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes IN (30, 60)),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (grid_end_hour > grid_start_hour)
);

CREATE TABLE settings (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  language            TEXT    NOT NULL DEFAULT 'pt-BR' CHECK (language IN ('pt-BR','en')),
  week_start          TEXT    NOT NULL DEFAULT 'monday' CHECK (week_start IN ('sunday','monday')),
  active_workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL
);

CREATE TABLE profile (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT
);

CREATE TABLE categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
  icon         TEXT    NOT NULL,
  color        TEXT    CHECK (color IS NULL OR color IN ('orange','red','pink','violet','blue','teal','green','gray')),
  UNIQUE (id, workspace_id),
  UNIQUE (workspace_id, name)
);

CREATE TABLE tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id  INTEGER NOT NULL,
  name         TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  description  TEXT,
  gif_url      TEXT,
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute   INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  CHECK (end_minute > start_minute),
  FOREIGN KEY (category_id, workspace_id)
    REFERENCES categories (id, workspace_id) ON DELETE NO ACTION
);

CREATE TABLE task_days (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  day     INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  PRIMARY KEY (task_id, day)
);

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_categories_workspace ON categories(workspace_id);

INSERT INTO workspaces (name) VALUES ('${DEFAULT_WORKSPACE_NAME}');
INSERT INTO settings (id, language, week_start, active_workspace_id)
  VALUES (1, 'pt-BR', 'monday', (SELECT id FROM workspaces ORDER BY id LIMIT 1));
INSERT INTO profile (id, display_name, avatar_url) VALUES (1, '', NULL);
`;

// M2: allow 15-minute grid slots. SQLite cannot alter a CHECK, so workspaces is rebuilt (the
// documented create-new / copy / drop / rename recipe). migrate() runs it with foreign_keys OFF and
// PRAGMA foreign_key_check before commit; categories/tasks/settings keep referencing "workspaces"
// by name, so they need no rebuild and their ON DELETE actions and the composite FK are untouched.
const M2_SLOT_15 = `
CREATE TABLE workspaces_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  grid_start_hour  INTEGER NOT NULL DEFAULT 6  CHECK (grid_start_hour BETWEEN 0 AND 23),
  grid_end_hour    INTEGER NOT NULL DEFAULT 22 CHECK (grid_end_hour BETWEEN 1 AND 24),
  slot_minutes     INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes IN (15, 30, 60)),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (grid_end_hour > grid_start_hour)
);
INSERT INTO workspaces_new (id, name, grid_start_hour, grid_end_hour, slot_minutes, created_at)
  SELECT id, name, grid_start_hour, grid_end_hour, slot_minutes, created_at FROM workspaces;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'workspaces')
  WHERE name = 'workspaces_new';
DROP TABLE workspaces;
ALTER TABLE workspaces_new RENAME TO workspaces;
`;

// M3: custom category colors. categories.color may now also be a lowercase "#rrggbb" (GLOB is
// case-sensitive and matches the whole string, so '#' + 6 lowercase hex digits exactly). SQLite
// cannot alter a CHECK, so categories is rebuilt; ids are copied and the AUTOINCREMENT high-water
// mark is carried over. tasks keeps referencing "categories" by name (composite FK untouched) and
// the workspace cascade still reaches the new table. Runs with foreign_keys OFF (see migrate()).
const M3_CUSTOM_COLORS = `
CREATE TABLE categories_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
  icon         TEXT    NOT NULL,
  color        TEXT    CHECK (
    color IS NULL
    OR color IN ('orange','red','pink','violet','blue','teal','green','gray')
    OR color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
  ),
  UNIQUE (id, workspace_id),
  UNIQUE (workspace_id, name)
);
INSERT INTO categories_new (id, workspace_id, name, icon, color)
  SELECT id, workspace_id, name, icon, color FROM categories;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'categories')
  WHERE name = 'categories_new' AND EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'categories');
INSERT INTO sqlite_sequence (name, seq)
  SELECT 'categories_new', seq FROM sqlite_sequence
  WHERE name = 'categories' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'categories_new');
DROP TABLE categories;
ALTER TABLE categories_new RENAME TO categories;
CREATE INDEX idx_categories_workspace ON categories(workspace_id);
`;

// M4: optional IANA time zone for "now"/"today". NULL = automatic (device zone).
const M4_TIMEZONE = `
ALTER TABLE settings ADD COLUMN timezone TEXT;
`;

export const MIGRATIONS: readonly string[] = [
  M1_INITIAL,
  M2_SLOT_15,
  M3_CUSTOM_COLORS,
  M4_TIMEZONE,
];
