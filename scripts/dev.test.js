import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

// A controlled npm shim tests supervision without connecting to any database.
async function run(t, fail) {
  const dir = mkdtempSync(join(tmpdir(), "campusdesk-runner-"));
  const bin = join(dir, "npm");
  writeFileSync(
    bin,
    `#!/usr/bin/env node\nimport('node:fs').then(fs => {\n fs.appendFileSync(process.env.RUNNER_LOG, process.cwd() + '\\n');\n process.on('SIGTERM', () => { fs.appendFileSync(process.env.RUNNER_LOG, 'stopped:' + process.cwd() + '\\n'); process.exit(0); });\n if (process.env.RUNNER_FAIL === 'yes' && process.cwd().endsWith('backend')) setTimeout(() => process.exit(7), 200);\n else setInterval(() => {}, 100);\n});\n`,
    { mode: 0o755 },
  );
  const log = join(dir, "events");
  const child = spawn(process.execPath, ["scripts/dev.js"], {
    env: {
      ...process.env,
      PATH: dir + ":" + process.env.PATH,
      RUNNER_LOG: log,
      RUNNER_FAIL: fail ? "yes" : "no",
    },
    stdio: "ignore",
  });
  t.after(() => {
    if (child.exitCode === null) child.kill("SIGTERM");
    rmSync(dir, { recursive: true, force: true });
  });
  const exit = new Promise((resolve) => child.on("exit", resolve));
  if (!fail) {
    await delay(400);
    child.kill("SIGTERM");
  }
  const code = await exit;
  const { readFileSync } = await import("node:fs");
  const events = readFileSync(log, "utf8");
  assert.match(events, /frontend/);
  assert.match(events, /backend/);
  assert.match(events, /stopped:.*frontend/);
  if (!fail) assert.match(events, /stopped:.*backend/);
  assert.equal(code, fail ? 7 : 0);
}
test(
  "child failure stops the sibling and preserves failure status",
  { timeout: 10000 },
  (t) => run(t, true),
);
test("termination stops both services cleanly", { timeout: 10000 }, (t) =>
  run(t, false),
);
