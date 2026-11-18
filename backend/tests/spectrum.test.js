import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { testDatabase } from "./database.js";
import { createApp } from "../src/app.js";
import { initAdmin } from "../scripts/admin.js";
let db, app, headers, student;
const data = {
  studentId: "SPECTRUM1",
  rollNumber: "SR1",
  firstName: "Fictional",
  lastName: "Spectrum",
  email: "spectrum@example.test",
  department: "Computing",
  academicYear: "2026-2027",
  semester: 1,
  batch: "2026",
  section: "A",
  status: "active",
};
beforeAll(async () => {
  db = await testDatabase();
  app = createApp({
    secret: "isolated-spectrum-test-secret-at-least-32",
    logging: false,
  });
  await initAdmin({
    email: "spectrum-admin@example.test",
    password: "Synthetic-spectrum-password-2026",
  });
  const auth = await request(app).post("/api/auth/login").send({
    email: "spectrum-admin@example.test",
    password: "Synthetic-spectrum-password-2026",
  });
  headers = { Authorization: "Bearer " + auth.body.token };
  student = (await request(app).post("/api/students").set(headers).send(data))
    .body;
}, 120000);
afterAll(async () => db?.stop());
it("rejects a stale editor precondition without overwriting another edit", async () => {
  const expected = JSON.stringify(student.updatedAt);
  const saved = await request(app)
    .put("/api/students/" + student._id)
    .set(headers)
    .set("If-Match", expected)
    .send({ ...data, firstName: "Newer" });
  expect(saved.status).toBe(200);
  const conflict = await request(app)
    .put("/api/students/" + student._id)
    .set(headers)
    .set("If-Match", expected)
    .send({ ...data, firstName: "Stale" });
  expect(conflict.status).toBe(409);
  expect(
    (
      await request(app)
        .get("/api/students/" + student._id)
        .set(headers)
    ).body.firstName,
  ).toBe("Newer");
});
it("returns picker context for academic relationships and keeps legacy writes compatible", async () => {
  const c = await request(app).post("/api/courses").set(headers).send({
    code: "SP101",
    name: "Fictional course",
    department: "Computing",
    academicYear: "2026-2027",
    semester: 1,
    credits: 3,
    facultyName: "Dr Example",
  });
  expect(c.status).toBe(201);
  const e = await request(app).post("/api/enrollments").set(headers).send({
    student: student._id,
    course: c.body._id,
    term: "2026-2027",
    status: "active",
  });
  expect(e.status).toBe(201);
  const list = await request(app).get("/api/enrollments").set(headers);
  expect(list.body.items[0].student).toMatchObject({
    rollNumber: "SR1",
    semester: 1,
    section: "A",
  });
  expect(list.body.items[0].course).toMatchObject({
    department: "Computing",
    semester: 1,
  });
  expect(
    (
      await request(app)
        .put("/api/students/" + student._id)
        .set(headers)
        .send({ ...data, firstName: "Legacy client" })
    ).status,
  ).toBe(200);
});
it("finds a complete student name while keeping regex metacharacters literal", async () => {
  const found = await request(app)
    .get("/api/students")
    .query({ search: "legacy CLIENT spectrum" })
    .set(headers);
  expect(found.status).toBe(200);
  expect(found.body.total).toBe(1);
  expect(found.body.items[0]._id).toBe(student._id);
  const literal = await request(app)
    .get("/api/students")
    .query({ search: ".*" })
    .set(headers);
  expect(literal.status).toBe(200);
  expect(literal.body.total).toBe(0);
});
