import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const image =
  "mongo@sha256:4c65244b50910461b9641a76131f84a2dcfd4da487f928298cea626b3842842c";
const name = "campusdesk-verify-" + randomBytes(6).toString("hex");
const includes = [],
  excludes = [],
  forwarded = [];
const requested = process.argv.slice(2);
for (let i = 0; i < requested.length; i++) {
  const arg = requested[i];
  if (arg === "--grep" || arg === "--grep-invert")
    (arg === "--grep" ? includes : excludes).push(requested[++i]);
  else if (arg.startsWith("--grep=")) includes.push(arg.slice(7));
  else if (arg.startsWith("--grep-invert=")) excludes.push(arg.slice(14));
  else forwarded.push(arg);
}
function browserArgs(project, suite) {
  const any = "[\\s\\S]*";
  let pattern =
    "^" +
    (suite === "core"
      ? "(?!" + any + "(?:Nova 4 upload|Spectrum ))"
      : "(?=" +
        any +
        "(?:" +
        (suite === "upload" ? "Nova 4 upload" : "Spectrum ") +
        "))");
  for (const value of includes) {
    if (!value) throw new Error("Missing grep expression");
    pattern += "(?=" + any + "(?:" + value + "))";
  }
  for (const value of excludes) {
    if (!value) throw new Error("Missing grep-invert expression");
    pattern += "(?!" + any + "(?:" + value + "))";
  }
  pattern += any + "$";
  return ["--project=" + project, "--grep=" + pattern, ...forwarded];
}
function docker(args) {
  const r = spawnSync("docker", args, { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(
      "Docker operation failed: " + (r.stderr || r.error?.message),
    );
  return r.stdout.trim();
}
let api,
  child,
  created = false,
  stopping = false;
async function stopChild(process) {
  if (!process || process.exitCode !== null) return;
  const done = new Promise((resolve) => process.once("exit", resolve));
  try {
    globalThis.process.kill(-process.pid, "SIGTERM");
  } catch {
    process.kill("SIGTERM");
  }
  await done;
}
async function cleanup() {
  if (stopping) return;
  stopping = true;
  await stopChild(child);
  await stopChild(api);
  if (created) docker(["stop", name]);
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => cleanup().then(() => process.exit(1)));
async function run(args, env) {
  await new Promise((resolve, reject) => {
    child = spawn("npm", args, {
      cwd: root,
      env,
      stdio: "inherit",
      detached: true,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Check failed with status " + code)),
    );
  });
  child = null;
}
try {
  console.log(
    "Starting isolated MongoDB replica set (official digest, disposable storage)",
  );
  docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--publish",
    "127.0.0.1::27017",
    "--tmpfs",
    "/data/db",
    image,
    "mongod",
    "--replSet",
    "rs0",
    "--bind_ip_all",
  ]);
  created = true;
  const address = docker(["port", name, "27017/tcp"]);
  if (!/^127\.0\.0\.1:\d+$/.test(address))
    throw new Error("Expected a loopback-only disposable port");
  let primary = false,
    initiated = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = spawnSync(
      "docker",
      [
        "exec",
        name,
        "mongosh",
        "--quiet",
        "--eval",
        initiated
          ? "if(!db.hello().isWritablePrimary)quit(1)"
          : 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})',
      ],
      { encoding: "utf8" },
    );
    if (result.status === 0) {
      if (initiated) {
        primary = true;
        break;
      }
      initiated = true;
    }
    await delay(500);
  }
  if (!primary) throw new Error("Disposable MongoDB never became primary");
  const env = {
    ...process.env,
    TEST_MONGODB_URI:
      "mongodb://" + address + "/?directConnection=true&replicaSet=rs0",
    E2E_ADMIN_EMAIL: "isolated@example.test",
    E2E_ADMIN_PASSWORD: randomBytes(24).toString("base64url"),
  };
  delete env.MONGODB_URI;
  delete env.JWT_SECRET;
  env.VITE_API_URL = "";
  env.CI = "1";
  await run(["test", "--prefix", "backend"], env);
  await run(["test", "--prefix", "frontend"], env);
  await run(["run", "test:dev"], env);
  await run(["run", "build", "--prefix", "frontend"], env);
  // A fresh API/database per project preserves production's login limit and
  // prevents one project's logout from revoking another project's sessions.
  let executed = 0;
  for (const project of ["desktop", "mobile"]) {
    for (const suite of ["spectrum", "core", "upload"]) {
      const args = browserArgs(project, suite);
      const discovery = spawnSync(
        process.execPath,
        ["node_modules/@playwright/test/cli.js", "test", "--list", ...args],
        { cwd: root + "frontend", env, encoding: "utf8" },
      );
      const count = Number(
        discovery.stdout?.match(/Total:\s+(\d+) tests?/)?.[1],
      );
      if (count === 0) {
        console.log(`No selected cases in ${project}/${suite}; group not run.`);
        continue;
      }
      if (discovery.status !== 0 || !Number.isFinite(count))
        throw new Error(
          "Browser selection failed: " + (discovery.stderr || discovery.stdout),
        );
      api = spawn(process.execPath, ["scripts/test-api.js"], {
        cwd: root + "backend",
        env,
        stdio: ["inherit", "inherit", "inherit", "ipc"],
        detached: true,
      });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Owned API readiness timed out")),
          15000,
        );
        api.once("message", (message) => {
          if (message.type === "ready") {
            clearTimeout(timer);
            resolve();
          }
        });
        api.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Owned API exited before readiness"));
        });
      });
      if (!(await fetch("http://127.0.0.1:5000/api/health")).ok)
        throw new Error("Owned API health check failed");
      await run(["run", "test:e2e", "--prefix", "frontend", "--", ...args], {
        ...env,
        E2E_ARTIFACT_PROJECT: project,
      });
      executed += count;
      await stopChild(api);
      api = null;
    }
  }
  if (!executed)
    throw new Error("No browser cases matched the requested selection");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
