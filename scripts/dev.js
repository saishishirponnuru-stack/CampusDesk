import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Each child has its own process group so watch-mode descendants also shut down.
const root = fileURLToPath(new URL("../", import.meta.url));
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        /* Already exited. */
      }
    }
  }
  const timer = setTimeout(() => {
    for (const child of children) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* Already exited. */
      }
    }
  }, 5000);
  timer.unref();
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
for (const [directory, script] of [
  ["backend", process.argv.includes("--local") ? "dev:local" : "start"],
  ["frontend", "dev"],
]) {
  console.log(`[CampusDesk] Starting ${directory} (${script})`);
  const child = spawn(
    "npm",
    [
      "run",
      script,
      ...(directory === "frontend" ? ["--", "--strictPort"] : []),
    ],
    {
      cwd: root + directory,
      stdio: "inherit",
      detached: true,
      env: process.env,
    },
  );
  children.push(child);
  child.on("error", () => {
    console.error(
      `[CampusDesk] Could not start ${directory}. Run npm ci in each service.`,
    );
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(
        `[CampusDesk] ${directory} stopped (${code ?? "signal"}); stopping both services.`,
      );
      stop(code || 1);
    }
  });
}
