// Local-only review lifecycle. Never reads .env or uses an Atlas address.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const name = "nova4-review-" + randomBytes(6).toString("hex");
const image =
  "mongo@sha256:4c65244b50910461b9641a76131f84a2dcfd4da487f928298cea626b3842842c";
const email = "reviewer@example.test",
  password = "Synthetic-Nova4-Review-2026";
const children = [];
let created = false,
  stopping = false;
function docker(args) {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || "Docker failed");
  return result.stdout.trim();
}
async function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of [...children].reverse()) {
    if (child.exitCode !== null) continue;
    const exit = new Promise((r) => child.once("exit", r));
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    await exit;
  }
  if (created) docker(["stop", name]);
}
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => stop().then(() => process.exit(0)));
function launch(command, args, cwd, env, ipc = false) {
  const child = spawn(command, args, {
    cwd,
    env,
    detached: true,
    stdio: ipc ? ["ignore", "inherit", "inherit", "ipc"] : "inherit",
  });
  children.push(child);
  child.on("error", (e) => {
    console.error(e.message);
    stop().then(() => process.exit(1));
  });
  child.on("exit", () => {
    if (!stopping) stop().then(() => process.exit(1));
  });
  return child;
}
try {
  for (const port of [5000, 5173]) {
    const net = await import("node:net");
    await new Promise((resolve, reject) => {
      const s = net.createServer();
      s.once("error", () =>
        reject(
          new Error(
            `Port ${port} is occupied; stop its owner before starting preview.`,
          ),
        ),
      );
      s.listen(port, "127.0.0.1", () => s.close(resolve));
    });
  }
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
    throw new Error("Expected owned loopback MongoDB");
  let initiated = false,
    primary = false;
  for (let i = 0; i < 60; i++) {
    const r = spawnSync(
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
    if (r.status === 0) {
      if (initiated) {
        primary = true;
        break;
      }
      initiated = true;
    }
    await delay(500);
  }
  if (!primary) throw new Error("Disposable replica set did not become ready");
  const env = {
    ...process.env,
    NODE_ENV: "development",
    TEST_MONGODB_URI: `mongodb://${address}/?directConnection=true&replicaSet=rs0`,
    E2E_ADMIN_EMAIL: email,
    E2E_ADMIN_PASSWORD: password,
    VITE_API_URL: "",
  };
  delete env.MONGODB_URI;
  delete env.JWT_SECRET;
  const api = launch(
    process.execPath,
    ["scripts/test-api.js"],
    root + "backend",
    env,
    true,
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("API readiness timed out")),
      20000,
    );
    api.once("message", (m) => {
      if (m.type === "ready") {
        clearTimeout(timer);
        resolve();
      }
    });
    api.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("API exited"));
    });
  });
  const request = async (path, body, token) => {
    const r = await fetch("http://127.0.0.1:5000/api" + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("Synthetic preview setup failed at " + path);
    return r.json();
  };
  const { token } = await request("/auth/login", { email, password });
  const course = await request(
    "/courses",
    {
      code: "LAB101",
      name: "Designing connected systems",
      department: "Computing",
      academicYear: "2026-2027",
      semester: 1,
      credits: 3,
      facultyName: "Dr. Rowan Example",
    },
    token,
  );
  for (const [i, firstName] of ["Avery", "Maya", "Noah"].entries()) {
    const student = await request(
      "/students",
      {
        studentId: `LAB-${i + 1}`,
        rollNumber: `L-${i + 1}`,
        firstName,
        lastName: "Example",
        email: `fictional-${i + 1}@example.test`,
        department: "Computing",
        academicYear: "2026-2027",
        semester: 1,
        batch: "2026",
        section: "A",
        status: "active",
      },
      token,
    );
    await request(
      "/enrollments",
      {
        student: student._id,
        course: course._id,
        term: "2026-2027",
        status: "active",
      },
      token,
    );
    await request(
      "/grades",
      {
        student: student._id,
        course: course._id,
        term: "2026-2027",
        assessment: "Fictional review exercise",
        marks: 78 + i * 5,
        maxMarks: 100,
      },
      token,
    );
    if (i < 2)
      await request(
        "/attendance",
        {
          student: student._id,
          course: course._id,
          date: "2026-11-17",
          status: i ? "late" : "present",
        },
        token,
      );
  }
  launch(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort"],
    root + "frontend",
    env,
  );
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch("http://127.0.0.1:5173");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(250);
  }
  if (!ready) throw new Error("Frontend readiness timed out");
  console.log(
    "Nova 4 local review ready. Fictional account: reviewer@example.test / Synthetic-Nova4-Review-2026. Ctrl+C removes only this disposable database/container.",
  );
} catch (e) {
  console.error(e.message);
  await stop();
  process.exitCode = 1;
}
