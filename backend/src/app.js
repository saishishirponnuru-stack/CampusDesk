import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino-http";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { Admin } from "./models/index.js";
import { authenticate, sign, fail } from "./middleware/auth.js";
import {
  loginSchema,
  passwordSchema,
  thresholdSchema,
} from "./validators/index.js";
import { routes, studentHistory } from "./controllers/records.js";
import { reports, csv } from "./services/reports.js";
export function createApp({
  secret,
  origins = ["http://localhost:5173"],
  logging = true,
  trustProxy = false,
} = {}) {
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const app = express();
  app.disable("x-powered-by");
  if (trustProxy) app.set("trust proxy", 1);
  app.use(
    helmet(),
    cors({
      origin(origin, callback) {
        callback(null, !origin || origins.includes(origin));
      },
    }),
    express.json({ limit: "100kb" }),
  );
  if (logging)
    app.use(
      pino({
        redact: ["req.headers.authorization", "req.headers.cookie"],
        serializers: {
          req: (req) => ({ method: req.method, url: req.url, id: req.id }),
        },
      }),
    );
  app.get("/api/health", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res
      .status(ready ? 200 : 503)
      .json({
        status: ready ? "ok" : "unavailable",
        database: ready ? "connected" : "disconnected",
      });
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many login attempts. Try again later." },
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const admin = await Admin.findOne({ email }).select("+passwordHash");
    const valid = await bcrypt.compare(
      password,
      admin?.passwordHash ??
        "$2b$10$4H0xTjBAE9oX4EuxS4u8he7V.YzD3TQJ4WsL68XLP5lEyP2TZ8fAe",
    );
    if (!admin || !valid) throw fail(401, "Invalid email or password");
    res.json({ token: sign(admin, secret), expiresIn: 900 });
  });
  const api = express.Router();
  api.use(authenticate(secret));
  const profile = (a) => ({
    name: a.name,
    email: a.email,
    thresholds: a.thresholds,
  });
  api.get("/auth/me", (req, res) => res.json(profile(req.admin)));
  api.post("/auth/logout", async (req, res) => {
    await Admin.updateOne(
      { _id: req.admin._id },
      { $inc: { tokenVersion: 1 } },
    );
    res.status(204).end();
  });
  api.post("/auth/password", authLimit, async (req, res) => {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    const admin = await Admin.findById(req.admin._id).select("+passwordHash");
    if (!(await bcrypt.compare(currentPassword, admin.passwordHash)))
      throw fail(400, "Current password is incorrect");
    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    admin.tokenVersion += 1;
    await admin.save();
    res.status(204).end();
  });
  api.put("/auth/thresholds", async (req, res) => {
    const data = thresholdSchema.parse(req.body);
    req.admin.thresholds = data.thresholds;
    await req.admin.save();
    res.json(profile(req.admin));
  });
  api.get("/students/:id/history", studentHistory);
  for (const kind of [
    "students",
    "courses",
    "enrollments",
    "attendance",
    "grades",
  ])
    routes(api, kind);
  api.get("/reports", async (req, res) => res.json(await reports()));
  api.get("/reports/:type.csv", async (req, res) => {
    const data = await reports();
    const type = req.params.type;
    if (
      ![
        "departments",
        "years",
        "courseEnrollments",
        "attendance",
        "performance",
      ].includes(type)
    )
      throw fail(404, "Report not found");
    res
      .type("text/csv")
      .attachment(type + ".csv")
      .send(csv(data[type]));
  });
  app.use("/api", api);
  app.use((req, res) =>
    res.status(404).json({ message: "Endpoint not found" }),
  );
  app.use((err, req, res, next) => {
    if (err instanceof ZodError)
      return res
        .status(422)
        .json({
          message: err.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
        });
    if (err.code === 11000)
      return res
        .status(409)
        .json({ message: "A record with these unique fields already exists" });
    if (err.name === "CastError")
      return res
        .status(400)
        .json({ message: "Invalid field value or resource ID" });
    if (err.name === "ValidationError")
      return res.status(422).json({ message: "Record validation failed" });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ message: "Invalid JSON request body" });
    if (err.type === "entity.too.large")
      return res.status(413).json({ message: "Request body is too large" });
    const status = err.status || 500;
    if (status === 500 && logging)
      console.error("API request failed:", err.name);
    res
      .status(status)
      .json({
        message:
          status >= 500 ? "Service temporarily unavailable" : err.message,
      });
  });
  return app;
}
