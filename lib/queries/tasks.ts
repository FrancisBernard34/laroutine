import { getDb } from "../db";
import type { Task } from "../types";

interface TaskRow {
  id: number;
  workspace_id: number;
  category_id: number;
  name: string;
  description: string | null;
  gif_url: string | null;
  start_minute: number;
  end_minute: number;
  days: string;
}

export interface TaskWriteInput {
  name: string;
  description?: string | null;
  gifUrl?: string | null;
  categoryId: number;
  startMinute: number;
  endMinute: number;
  days: number[];
}

const SELECT = `
SELECT t.id, t.workspace_id, t.category_id, t.name, t.description, t.gif_url,
       t.start_minute, t.end_minute,
       (SELECT json_group_array(day) FROM (SELECT day FROM task_days WHERE task_id = t.id ORDER BY day)) AS days
FROM tasks t`;

function map(r: TaskRow): Task {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    gifUrl: r.gif_url,
    startMinute: r.start_minute,
    endMinute: r.end_minute,
    days: JSON.parse(r.days) as number[],
  };
}

export function listTasks(workspaceId: number): Task[] {
  const rows = getDb()
    .prepare(`${SELECT} WHERE t.workspace_id = ? ORDER BY t.start_minute, t.id`)
    .all(workspaceId) as TaskRow[];
  return rows.map(map);
}

export function getTask(id: number): Task | null {
  const r = getDb().prepare(`${SELECT} WHERE t.id = ?`).get(id) as TaskRow | undefined;
  return r ? map(r) : null;
}

function writeDays(taskId: number, days: number[]): void {
  const db = getDb();
  db.prepare("DELETE FROM task_days WHERE task_id = ?").run(taskId);
  const ins = db.prepare("INSERT INTO task_days (task_id, day) VALUES (?, ?)");
  for (const d of new Set(days)) ins.run(taskId, d);
}

const blankToNull = (v: string | null | undefined) => v?.trim() || null;

/** Throws if the category belongs to another workspace (composite FK). */
export function createTask(workspaceId: number, input: TaskWriteInput): Task {
  const db = getDb();
  return db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO tasks (workspace_id, category_id, name, description, gif_url, start_minute, end_minute)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        workspaceId,
        input.categoryId,
        input.name.trim(),
        blankToNull(input.description),
        blankToNull(input.gifUrl),
        input.startMinute,
        input.endMinute,
      );
    const id = Number(lastInsertRowid);
    writeDays(id, input.days);
    return getTask(id)!;
  })();
}

/** Returns null if the task does not exist. Throws on cross-workspace category. */
export function updateTask(id: number, input: TaskWriteInput): Task | null {
  const db = getDb();
  return db.transaction(() => {
    const res = db
      .prepare(
        `UPDATE tasks SET category_id = ?, name = ?, description = ?, gif_url = ?,
                start_minute = ?, end_minute = ? WHERE id = ?`,
      )
      .run(
        input.categoryId,
        input.name.trim(),
        blankToNull(input.description),
        blankToNull(input.gifUrl),
        input.startMinute,
        input.endMinute,
        id,
      );
    if (!res.changes) return null;
    writeDays(id, input.days);
    return getTask(id);
  })();
}

export function deleteTask(id: number): boolean {
  return getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
}
