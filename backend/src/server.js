import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
if (!process.env.MONGODB_URI)
  throw new Error("Set MONGODB_URI before starting the API");
const app = createApp({
  secret: process.env.JWT_SECRET,
  origins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((v) => v.trim()),
  trustProxy: process.env.TRUST_PROXY === "1",
});
await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
const server = app.listen(Number(process.env.PORT) || 5000, "0.0.0.0", () =>
  console.log("CampusDesk API ready"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }),
  );
