import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createApp } from "../src/app.js";
import { initAdmin } from "./admin.js";
import { seed } from "./seed.js";
if (process.env.NODE_ENV === "production")
  throw new Error("Local development runner cannot run in production");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw new Error(
    "Supply ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) for local development",
  );
const dbPath = process.env.LOCAL_DB_PATH || "/tmp/campusdesk-local-db";
await mkdir(dbPath, { recursive: true });
const mongo = await MongoMemoryServer.create({
  instance: { dbPath, storageEngine: "wiredTiger" },
  binary: { version: "7.0.24" },
});
await mongoose.connect(mongo.getUri("campusdesk_local"));
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
await initAdmin({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});
if (process.env.DEMO_DATA === "yes") await seed();
const app = createApp({
  secret: process.env.JWT_SECRET || randomBytes(48).toString("hex"),
});
const server = app.listen(5000, "0.0.0.0", () =>
  console.log(
    "Local API ready; synthetic data only. Data directory: " + dbPath,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      await mongo.stop();
      process.exit(0);
    }),
  );
