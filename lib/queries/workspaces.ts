import { getDb } from "../db";
import type { Workspace } from "../types";

interface WorkspaceRow {
  id: number;
  name: string;
  grid_start_hour: number;
  grid_end_hour: number;
  slot_minutes: 15 | 30 | 60;
}

const COLS = "id, name, grid_start_hour, grid_end_hour, slot_minutes";

function map(r: WorkspaceRow): Workspace {
  return {
    id: r.id,
    name: r.name,
    gridStartHour: r.grid_start_hour,
    gridEndHour: r.grid_end_hour,
    slotMinutes: r.slot_minutes,
  };
}

export function listWorkspaces(): Workspace[] {
  const rows = getDb()
    .prepare(`SELECT ${COLS} FROM workspaces ORDER BY id`)
    .all() as WorkspaceRow[];
  return rows.map(map);
}

export function getWorkspace(id: number): Workspace | null {
  const r = getDb().prepare(`SELECT ${COLS} FROM workspaces WHERE id = ?`).get(id) as
    | WorkspaceRow
    | undefined;
  return r ? map(r) : null;
}

/** Falls back to the lowest id (and rewrites the setting) if unset or dangling. */
export function getActiveWorkspace(): Workspace {
  const db = getDb();
  const s = db.prepare("SELECT active_workspace_id FROM settings WHERE id = 1").get() as {
    active_workspace_id: number | null;
  };
  if (s.active_workspace_id !== null) {
    const ws = getWorkspace(s.active_workspace_id);
    if (ws) return ws;
  }
  const first = db
    .prepare(`SELECT ${COLS} FROM workspaces ORDER BY id LIMIT 1`)
    .get() as WorkspaceRow | undefined;
  if (!first) throw new Error("No workspace exists (invariant violated)");
  db.prepare("UPDATE settings SET active_workspace_id = ? WHERE id = 1").run(first.id);
  return map(first);
}

/** Creates a workspace with default grid (6-22 / 60) and makes it active. */
export function createWorkspace(name: string): Workspace {
  const db = getDb();
  return db.transaction(() => {
    const { lastInsertRowid } = db.prepare("INSERT INTO workspaces (name) VALUES (?)").run(name.trim());
    const id = Number(lastInsertRowid);
    db.prepare("UPDATE settings SET active_workspace_id = ? WHERE id = 1").run(id);
    return getWorkspace(id)!;
  })();
}

export function setActiveWorkspace(id: number): boolean {
  if (!getWorkspace(id)) return false;
  getDb().prepare("UPDATE settings SET active_workspace_id = ? WHERE id = 1").run(id);
  return true;
}

export function updateWorkspaceGrid(
  id: number,
  grid: { startHour: number; endHour: number; slotMinutes: 15 | 30 | 60 },
): Workspace | null {
  const res = getDb()
    .prepare(
      "UPDATE workspaces SET grid_start_hour = ?, grid_end_hour = ?, slot_minutes = ? WHERE id = ?",
    )
    .run(grid.startHour, grid.endHour, grid.slotMinutes, id);
  return res.changes ? getWorkspace(id) : null;
}

/**
 * Deletes a workspace; categories, tasks and task_days go with it via ON DELETE CASCADE.
 * Returns false (nothing deleted) if it is missing or the last remaining workspace.
 */
export function deleteWorkspace(id: number): boolean {
  const db = getDb();
  return db.transaction(() => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM workspaces").get() as { n: number };
    if (n <= 1) return false;
    return db.prepare("DELETE FROM workspaces WHERE id = ?").run(id).changes > 0;
  })();
}
