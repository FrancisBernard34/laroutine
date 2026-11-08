import { getDb } from "../db";
import type { Category, CategoryColorValue } from "../types";

interface CategoryRow {
  id: number;
  workspace_id: number;
  name: string;
  icon: string;
  color: CategoryColorValue | null;
}

const COLS = "id, workspace_id, name, icon, color";

function map(r: CategoryRow): Category {
  return { id: r.id, workspaceId: r.workspace_id, name: r.name, icon: r.icon, color: r.color };
}

export function listCategories(workspaceId: number): Category[] {
  const rows = getDb()
    .prepare(`SELECT ${COLS} FROM categories WHERE workspace_id = ? ORDER BY name COLLATE NOCASE, id`)
    .all(workspaceId) as CategoryRow[];
  return rows.map(map);
}

export function getCategory(id: number): Category | null {
  const r = getDb().prepare(`SELECT ${COLS} FROM categories WHERE id = ?`).get(id) as
    | CategoryRow
    | undefined;
  return r ? map(r) : null;
}

/** Throws on a duplicate name within the workspace (UNIQUE constraint). */
export function createCategory(
  workspaceId: number,
  input: { name: string; icon: string; color: CategoryColorValue | null },
): Category {
  const { lastInsertRowid } = getDb()
    .prepare("INSERT INTO categories (workspace_id, name, icon, color) VALUES (?, ?, ?, ?)")
    .run(workspaceId, input.name.trim(), input.icon, input.color);
  return getCategory(Number(lastInsertRowid))!;
}

export function updateCategory(
  id: number,
  input: { name: string; icon: string; color: CategoryColorValue | null },
): Category | null {
  const res = getDb()
    .prepare("UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?")
    .run(input.name.trim(), input.icon, input.color, id);
  return res.changes ? getCategory(id) : null;
}

export function countCategoryTasks(id: number): number {
  const r = getDb().prepare("SELECT COUNT(*) AS n FROM tasks WHERE category_id = ?").get(id) as {
    n: number;
  };
  return r.n;
}

/** Blocked while tasks use the category (returns "in_use"). */
export function deleteCategory(id: number): "deleted" | "in_use" | "not_found" {
  const db = getDb();
  return db.transaction((): "deleted" | "in_use" | "not_found" => {
    if (countCategoryTasks(id) > 0) return "in_use";
    return db.prepare("DELETE FROM categories WHERE id = ?").run(id).changes > 0
      ? "deleted"
      : "not_found";
  })();
}
