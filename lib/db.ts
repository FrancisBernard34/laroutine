import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { MIGRATIONS } from "./schema";

export type Db = Database.Database;

export const DEFAULT_DB_PATH = "./data/laroutine.db";

export function resolveDbPath(): string {
  return resolve(/*turbopackIgnore: true*/ process.env.LAROUTINE_DB_PATH || DEFAULT_DB_PATH);
}

/**
 * Apply pending migrations, each in its own transaction. Idempotent.
 * foreign_keys is switched OFF around each one (the pragma is a no-op inside a transaction) so
 * table rebuilds do not trigger cascades; foreign_key_check must come back clean before commit.
 */
export function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  if (current >= MIGRATIONS.length) return;
  const fkWasOn = db.pragma("foreign_keys", { simple: true }) === 1;
  db.pragma("foreign_keys = OFF");
  try {
    for (let i = current; i < MIGRATIONS.length; i++) {
      db.transaction(() => {
        db.exec(MIGRATIONS[i]);
        const violations = db.pragma("foreign_key_check") as unknown[];
        if (violations.length > 0) {
          throw new Error(`Migration ${i + 1} left foreign key violations`);
        }
        db.pragma(`user_version = ${i + 1}`);
      })();
    }
  } finally {
    if (fkWasOn) db.pragma("foreign_keys = ON");
  }
}

/** Open (creating dir/file if needed) and migrate. No WAL: one file is the whole state. */
export function openDatabase(path: string): Db {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const globalForDb = globalThis as unknown as { __laroutineDb?: Db };

/** Lazy singleton: nothing touches SQLite until the first call (never at import / build). */
export function getDb(): Db {
  if (!globalForDb.__laroutineDb) {
    globalForDb.__laroutineDb = openDatabase(resolveDbPath());
  }
  return globalForDb.__laroutineDb;
}
