import assert from "node:assert/strict"
import { describe, it } from "node:test"
import Database from "better-sqlite3"

import { MIGRATIONS } from "./schema.ts"

describe("migration 2 (15-minute slots)", () => {
  it("rebuilds workspaces keeping ids, data, cascades and the composite FK", () => {
    const db = new Database(":memory:")
    db.exec(MIGRATIONS[0])
    db.exec("INSERT INTO workspaces (name, slot_minutes) VALUES ('B', 30)")
    db.exec("INSERT INTO workspaces (name) VALUES ('C')")
    db.exec("DELETE FROM workspaces WHERE id = 3")
    db.exec("INSERT INTO categories (workspace_id, name, icon) VALUES (2, 'Cat', 'x')")
    db.exec("INSERT INTO tasks (workspace_id, category_id, name, start_minute, end_minute) VALUES (2, 1, 'T', 540, 600)")
    db.exec("INSERT INTO task_days VALUES (1, 1)")
    assert.throws(() => db.exec("UPDATE workspaces SET slot_minutes = 15 WHERE id = 1"))

    db.pragma("foreign_keys = OFF")
    db.exec(MIGRATIONS[1])
    assert.deepEqual(db.pragma("foreign_key_check"), [])
    db.pragma("foreign_keys = ON")

    db.exec("UPDATE workspaces SET slot_minutes = 15 WHERE id = 2")
    assert.throws(() => db.exec("UPDATE workspaces SET slot_minutes = 20 WHERE id = 2"))
    assert.deepEqual(
      db.prepare("SELECT id, name, slot_minutes FROM workspaces ORDER BY id").all(),
      [
        { id: 1, name: "Minha rotina", slot_minutes: 60 },
        { id: 2, name: "B", slot_minutes: 15 },
      ],
    )
    // AUTOINCREMENT high-water mark preserved (id 3 was used before).
    db.exec("INSERT INTO workspaces (name) VALUES ('D')")
    assert.equal((db.prepare("SELECT max(id) AS m FROM workspaces").get() as { m: number }).m, 4)
    // Cascade still wipes categories/tasks/task_days.
    db.exec("DELETE FROM workspaces WHERE id = 2")
    for (const t of ["categories", "tasks", "task_days"]) {
      assert.equal((db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n, 0)
    }
    db.close()
  })
})

function applyAll(db: Database.Database, upTo: number) {
  db.pragma("foreign_keys = OFF")
  for (let i = 0; i < upTo; i++) db.exec(MIGRATIONS[i])
  assert.deepEqual(db.pragma("foreign_key_check"), [])
  db.pragma("foreign_keys = ON")
}

const categoriesSql = (db: Database.Database) =>
  (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'categories'").get() as { sql: string }).sql
const count = (db: Database.Database, t: string) =>
  (db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n

describe("migration 4 (timezone)", () => {
  it("adds a nullable timezone to a v3 database, keeping settings", () => {
    const db = new Database(":memory:")
    applyAll(db, 3)
    db.exec("UPDATE settings SET language = 'en', week_start = 'sunday' WHERE id = 1")
    db.pragma("foreign_keys = OFF")
    db.transaction(() => db.exec(MIGRATIONS[3]))()
    assert.deepEqual(db.pragma("foreign_key_check"), [])
    db.pragma("foreign_keys = ON")
    assert.deepEqual(db.prepare("SELECT language, week_start, timezone FROM settings").all(), [
      { language: "en", week_start: "sunday", timezone: null },
    ])
    db.exec("UPDATE settings SET timezone = 'America/Sao_Paulo'")
    assert.equal((db.prepare("SELECT timezone AS z FROM settings").get() as { z: string }).z, "America/Sao_Paulo")
    db.close()
  })
})

describe("migration 3 (custom category colors)", () => {
  it("fresh and upgraded databases end with the same categories schema", () => {
    const fresh = new Database(":memory:")
    applyAll(fresh, 3)
    const up = new Database(":memory:")
    applyAll(up, 2)
    up.exec("INSERT INTO categories (workspace_id, name, icon, color) VALUES (1, 'Old', 'x', 'teal')")
    up.pragma("foreign_keys = OFF")
    up.exec(MIGRATIONS[2])
    up.pragma("foreign_keys = ON")
    assert.equal(categoriesSql(fresh).replace(/categories_new/g, "categories"), categoriesSql(up).replace(/categories_new/g, "categories"))
    const idx = (d: Database.Database) =>
      d.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'categories' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
    assert.deepEqual(idx(fresh), idx(up))
    assert.deepEqual(idx(up), [{ name: "idx_categories_workspace" }])
    fresh.close()
    up.close()
  })

  it("accepts presets, null and lowercase hex; rejects garbage", () => {
    const db = new Database(":memory:")
    applyAll(db, 3)
    let n = 0
    const ins = (color: string | null) =>
      db.prepare("INSERT INTO categories (workspace_id, name, icon, color) VALUES (1, ?, 'x', ?)").run(`c${n++}`, color)
    for (const ok of [null, "orange", "gray", "#ffffff", "#000000", "#a1b2c3"]) assert.doesNotThrow(() => ins(ok), String(ok))
    for (const bad of ["crimson", "Red", "#12", "#fff", "#gggggg", "#A1B2C3", "#a1b2c3a", "a1b2c3", "#a1b2c", "", "'; DROP TABLE tasks;--", "#a1b2c3\n"])
      assert.throws(() => ins(bad), /CHECK/, JSON.stringify(bad))
    assert.throws(() => db.exec("UPDATE categories SET color = 'crimson' WHERE id = 1"))
    db.close()
  })

  it("keeps ids, the AUTOINCREMENT mark, tasks, the composite FK and cascades", () => {
    const db = new Database(":memory:")
    applyAll(db, 2)
    db.exec("INSERT INTO workspaces (name) VALUES ('B')")
    db.exec("INSERT INTO categories (workspace_id, name, icon, color) VALUES (1, 'A', 'x', 'teal')")
    db.exec("INSERT INTO categories (workspace_id, name, icon, color) VALUES (2, 'B', 'x', NULL)")
    db.exec("INSERT INTO categories (workspace_id, name, icon) VALUES (1, 'Gone', 'x')")
    db.exec("DELETE FROM categories WHERE id = 3") // high-water mark 3 > max(id) 2
    db.exec("INSERT INTO tasks (workspace_id, category_id, name, start_minute, end_minute) VALUES (1, 1, 'T', 540, 600)")
    db.exec("INSERT INTO task_days VALUES (1, 1)")

    db.pragma("foreign_keys = OFF")
    db.transaction(() => db.exec(MIGRATIONS[2]))()
    assert.deepEqual(db.pragma("foreign_key_check"), [])
    db.pragma("foreign_keys = ON")

    assert.deepEqual(
      db.prepare("SELECT id, workspace_id, name, color FROM categories ORDER BY id").all(),
      [
        { id: 1, workspace_id: 1, name: "A", color: "teal" },
        { id: 2, workspace_id: 2, name: "B", color: null },
      ],
    )
    db.exec("INSERT INTO categories (workspace_id, name, icon, color) VALUES (1, 'N', 'x', '#123abc')")
    assert.equal((db.prepare("SELECT max(id) AS m FROM categories").get() as { m: number }).m, 4)
    // Composite FK: a task cannot use another workspace's category.
    assert.throws(() =>
      db.exec("INSERT INTO tasks (workspace_id, category_id, name, start_minute, end_minute) VALUES (1, 2, 'X', 60, 120)"),
    )
    // A category in use cannot be deleted (NO ACTION).
    assert.throws(() => db.exec("DELETE FROM categories WHERE id = 1"))
    // Workspace cascade wipes categories, tasks and task_days.
    db.exec("DELETE FROM workspaces WHERE id = 1")
    assert.equal(count(db, "tasks"), 0)
    assert.equal(count(db, "task_days"), 0)
    assert.deepEqual(db.prepare("SELECT id FROM categories").all(), [{ id: 2 }])
    assert.deepEqual(db.pragma("foreign_key_check"), [])
    db.close()
  })
})
