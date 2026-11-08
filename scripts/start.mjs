// Starts the production server from the `output: "standalone"` build.
// `next start` does not work with standalone output, so we copy the static
// assets next to the standalone server (as Next.js documents) and run it.
// Honors PORT and HOSTNAME (and LAROUTINE_DB_PATH, read by the app).
import { cpSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");
const server = join(standalone, "server.js");

if (!existsSync(server)) {
  console.error("No standalone build found. Run `npm run build` first.");
  process.exit(1);
}

const staticSrc = join(root, ".next", "static");
if (existsSync(staticSrc)) {
  cpSync(staticSrc, join(standalone, ".next", "static"), { recursive: true });
}
const publicSrc = join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standalone, "public"), { recursive: true });
}

// The server runs with the standalone directory as cwd, so pin the DB path
// (default ./data/laroutine.db) to where `npm start` was invoked instead.
const env = { ...process.env };
env.LAROUTINE_DB_PATH = resolve(
  process.cwd(),
  env.LAROUTINE_DB_PATH || "data/laroutine.db",
);

const child = spawn(process.execPath, [server], {
  cwd: standalone,
  env,
  stdio: "inherit",
});
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
