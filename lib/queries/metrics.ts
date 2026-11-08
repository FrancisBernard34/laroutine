import { getDb } from "../db";
import type { CategoryColorValue, Metrics } from "../types";

interface CatRow {
  id: number;
  name: string;
  icon: string;
  color: CategoryColorValue | null;
  hours: number;
  task_count: number;
}

/** Hours count once per task-day; task count once per task. */
export function getMetrics(workspaceId: number): Metrics {
  const db = getDb();
  const cats = db
    .prepare(
      `SELECT c.id, c.name, c.icon, c.color,
              COALESCE(SUM(t.end_minute - t.start_minute), 0) / 60.0 AS hours,
              COUNT(DISTINCT t.id) AS task_count
       FROM categories c
       LEFT JOIN tasks t     ON t.category_id = c.id
       LEFT JOIN task_days d ON d.task_id = t.id
       WHERE c.workspace_id = ? GROUP BY c.id ORDER BY c.name COLLATE NOCASE, c.id`,
    )
    .all(workspaceId) as CatRow[];

  const days = db
    .prepare(
      `SELECT d.day, SUM(t.end_minute - t.start_minute) / 60.0 AS hours
       FROM task_days d JOIN tasks t ON t.id = d.task_id
       WHERE t.workspace_id = ? GROUP BY d.day`,
    )
    .all(workspaceId) as { day: number; hours: number }[];

  const hoursByDay = [0, 0, 0, 0, 0, 0, 0];
  for (const r of days) hoursByDay[r.day] = r.hours;

  const { n } = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE workspace_id = ?").get(workspaceId) as {
    n: number;
  };

  return {
    byCategory: cats.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      hours: r.hours,
      taskCount: r.task_count,
    })),
    hoursByDay,
    totalTasks: n,
  };
}
