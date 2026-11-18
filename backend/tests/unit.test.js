import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { schemas, thresholdSchema, id } from "../src/validators/index.js";
import { queryOptions } from "../src/services/records.js";
import { csv, gradeLabel } from "../src/services/reports.js";
import { sign } from "../src/middleware/auth.js";
const secret = "isolated-test-secret-over-32-characters";
describe("Validation and security without a database", () => {
  it("health reports database unavailable rather than a fabricated success", async () => {
    const r = await request(createApp({ secret, logging: false })).get(
      "/api/health",
    );
    expect(r.status).toBe(503);
    expect(r.body.database).toBe("disconnected");
  });
  it("requires a strong signing secret", () =>
    expect(() => createApp({ secret: "short" })).toThrow());
  it("rejects anonymous access without querying MongoDB", async () =>
    expect(
      (await request(createApp({ secret, logging: false })).get("/api/grades"))
        .status,
    ).toBe(401));
  it("rejects malformed JWTs", async () =>
    expect(
      (
        await request(createApp({ secret, logging: false }))
          .get("/api/grades")
          .set("Authorization", "Bearer bad")
      ).status,
    ).toBe(401));
  it("issues correctly scoped, expiring tokens", () => {
    const p = jwt.verify(
      sign({ _id: "123", tokenVersion: 2 }, secret),
      secret,
      { issuer: "campusdesk", audience: "campusdesk-admin" },
    );
    expect(p.exp - p.iat).toBe(900);
    expect(p.version).toBe(2);
  });
  it("validates ObjectIds", () => {
    expect(id.safeParse("invalid").success).toBe(false);
    expect(id.safeParse("a".repeat(24)).success).toBe(true);
  });
  it("requires real calendar dates", () => {
    expect(
      schemas.attendance.safeParse({
        student: "a".repeat(24),
        course: "b".repeat(24),
        date: "2026-02-30",
        status: "present",
      }).success,
    ).toBe(false);
  });
  it("rejects marks outside assessment boundaries", () => {
    const data = {
      student: "a".repeat(24),
      course: "b".repeat(24),
      term: "2026",
      assessment: "Test",
      marks: 101,
      maxMarks: 100,
    };
    expect(schemas.grades.safeParse(data).success).toBe(false);
    expect(schemas.grades.safeParse({ ...data, marks: 0 }).success).toBe(true);
    expect(schemas.grades.safeParse({ ...data, marks: -1 }).success).toBe(
      false,
    );
  });
  it("requires grade policy to cover zero with unique minimums", () => {
    expect(
      thresholdSchema.safeParse({
        thresholds: [
          { label: "A", minimum: 90 },
          { label: "B", minimum: 90 },
        ],
      }).success,
    ).toBe(false);
    expect(
      thresholdSchema.safeParse({
        thresholds: [
          { label: "Pass", minimum: 50 },
          { label: "Fail", minimum: 0 },
        ],
      }).success,
    ).toBe(true);
  });
  it("calculates inclusive grade boundaries from policy", () => {
    expect(
      gradeLabel(90, [
        { label: "A", minimum: 90 },
        { label: "F", minimum: 0 },
      ]),
    ).toBe("A");
    expect(
      gradeLabel(89.99, [
        { label: "A", minimum: 90 },
        { label: "F", minimum: 0 },
      ]),
    ).toBe("F");
  });
  it("clamps pagination and whitelists sort fields", () => {
    const q = queryOptions("students", {
      page: "-2",
      limit: "100000",
      sort: "passwordHash",
    });
    expect(q.page).toBe(1);
    expect(q.limit).toBe(100);
    expect(q.sort).toEqual({ createdAt: -1, _id: 1 });
  });
  it("escapes search regex metacharacters", () => {
    const q = queryOptions("students", { search: ".*" });
    expect(q.filter.$or[0].firstName.$regex).toBe("\\.\\*");
  });
  it("quotes CSV delimiters and neutralizes formula prefixes", () => {
    expect(csv([{ name: "=1+2", value: "a,b" }])).toContain('"\'=1+2","a,b"');
  });
  it("handles unknown endpoints and malformed request JSON safely", async () => {
    const app = createApp({ secret, logging: false });
    expect((await request(app).get("/not-found")).status).toBe(404);
    const r = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{broken");
    expect(r.status).toBe(400);
    expect(r.text).not.toContain("SyntaxError");
  });
});
