import { testDatabase } from "../tests/database.js";
import { createApp } from "../src/app.js";
import { initAdmin } from "./admin.js";
import { randomBytes } from "node:crypto";
if (process.env.NODE_ENV === "production" || !process.env.TEST_MONGODB_URI)
  throw new Error("Use only with an explicit disposable TEST_MONGODB_URI");
const db = await testDatabase();
await initAdmin({
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
});
const app = createApp({
  secret: randomBytes(48).toString("hex"),
  logging: false,
});
const server = app.listen(5000, "127.0.0.1", () =>
  console.log("Isolated test API ready"),
);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await db.stop();
      process.exit(0);
    });
  });
