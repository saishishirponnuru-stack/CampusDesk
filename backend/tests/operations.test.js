import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
  vi,
} from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { testDatabase } from "./database.js";
import { createApp } from "../src/app.js";
import { initAdmin } from "../scripts/admin.js";
import {
  Student,
  Course,
  Enrollment,
  Attendance,
  OperationReceipt,
} from "../src/models/index.js";
import { studentFields } from "../src/validators/operations.js";
import { csv } from "../src/services/reports.js";
let db, app, token, course, students;
const auth = () => ({ Authorization: "Bearer " + token });
const base = {
  department: "Computing",
  academicYear: "2026-2027",
  semester: 1,
  batch: "2026",
  section: "A",
  status: "active",
};
beforeAll(async () => {
  db = await testDatabase({ replicaSet: true });
  app = createApp({
    secret: "isolated-operations-secret-over-32-characters",
    logging: false,
  });
  await initAdmin({
    email: "operations@example.test",
    password: "Synthetic-operations-pass-123",
  });
  token = (
    await request(app).post("/api/auth/login").send({
      email: "operations@example.test",
      password: "Synthetic-operations-pass-123",
    })
  ).body.token;
  students = await Student.insertMany(
    [0, 1, 2].map((i) => ({
      ...base,
      studentId: "BASE-" + i,
      rollNumber: "BASE-R" + i,
      firstName: "Synthetic",
      lastName: String(i),
      email: "base" + i + "@example.test",
    })),
  );
  course = await Course.create({
    code: "BATCH101",
    name: "Batch course",
    department: base.department,
    academicYear: base.academicYear,
    semester: 1,
    credits: 3,
    facultyName: "Dr Synthetic",
  });
  await Enrollment.insertMany(
    students.slice(0, 2).map((student) => ({
      student: student._id,
      course: course._id,
      term: base.academicYear,
      status: "active",
    })),
  );
}, 120000);
beforeEach(async () => {
  await Attendance.deleteMany({});
  await OperationReceipt.deleteMany({});
  await Student.deleteMany({ studentId: /^IMPORT-/ });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await db?.stop();
});
const batch = (status = "present") => ({
  course: String(course._id),
  date: "2026-11-16",
  records: students.slice(0, 2).map((student) => ({
    student: String(student._id),
    status,
    expectedRevision: null,
  })),
});
const postBatch = (data) =>
  request(app).post("/api/attendance/bulk").set(auth()).send(data);
it("protects all operation endpoints and reports replica set capability", async () => {
  for (const path of [
    "/api/attendance/bulk",
    "/api/students/import",
    "/api/students/import/preview",
  ])
    expect((await request(app).post(path).send({})).status).toBe(401);
  expect(
    (await request(app).get("/api/students/import/template.csv")).status,
  ).toBe(401);
  expect(
    (await request(app).get("/api/operations/capabilities").set(auth())).body
      .atomicBatches,
  ).toBe(true);
});
it("saves a valid atomic batch, retries without duplicates and lists eligible students only", async () => {
  const first = await postBatch(batch());
  expect(first.status).toBe(200);
  expect(first.body).toMatchObject({ created: 2, updated: 0, unchanged: 0 });
  const retry = await postBatch(batch());
  expect(retry.body).toMatchObject({ created: 0, updated: 0, unchanged: 2 });
  expect(await Attendance.countDocuments()).toBe(2);
  const register = await request(app)
    .get(
      `/api/attendance/register?course=${course._id}&date=2026-11-16&page=1&limit=1`,
    )
    .set(auth());
  expect(register.body).toMatchObject({ total: 2, pages: 2, page: 1 });
  expect(register.body.items).toHaveLength(1);
  expect(register.body.items[0].attendance.revision).toBe(1);
});
it("rejects malformed, duplicate, empty and oversized batches", async () => {
  for (const data of [
    { ...batch(), date: "2026-02-30" },
    { ...batch(), records: [] },
    { ...batch(), records: [batch().records[0], batch().records[0]] },
    { ...batch(), records: Array(101).fill(batch().records[0]) },
    { ...batch(), records: [{ ...batch().records[0], status: "unknown" }] },
  ])
    expect((await postBatch(data)).status).toBe(422);
  expect(await Attendance.countDocuments()).toBe(0);
});
it("rejects missing courses and every ineligible row without a partial write", async () => {
  expect(
    (
      await postBatch({
        ...batch(),
        course: String(new mongoose.Types.ObjectId()),
      })
    ).status,
  ).toBe(404);
  for (const student of [
    String(students[2]._id),
    String(new mongoose.Types.ObjectId()),
  ]) {
    expect(
      (
        await postBatch({
          ...batch(),
          records: [
            batch().records[0],
            { student, status: "late", expectedRevision: null },
          ],
        })
      ).status,
    ).toBe(422);
    expect(await Attendance.countDocuments()).toBe(0);
  }
});
it("updates saved records and rejects stale revisions including individual edits", async () => {
  await postBatch(batch());
  const data = batch("late");
  data.records = data.records.map((row) => ({ ...row, expectedRevision: 1 }));
  expect((await postBatch(data)).body.updated).toBe(2);
  const stale = await postBatch({
    ...batch("absent"),
    records: batch("absent").records.map((row) => ({
      ...row,
      expectedRevision: 1,
    })),
  });
  expect(stale.status).toBe(409);
  expect(await Attendance.countDocuments({ status: "late" })).toBe(2);
  const current = await Attendance.findOne();
  await request(app)
    .put("/api/attendance/" + current._id)
    .set(auth())
    .send({
      student: String(current.student),
      course: String(course._id),
      date: current.date,
      status: "absent",
    });
  expect((await Attendance.findById(current._id)).revision).toBe(3);
});
it("serializes conflicting submissions and counts only recorded sessions", async () => {
  await postBatch({ ...batch(), records: [batch().records[0]] });
  const data = {
    ...batch(),
    records: [{ ...batch().records[0], expectedRevision: 1 }],
  };
  const responses = await Promise.all([
    postBatch({ ...data, records: [{ ...data.records[0], status: "late" }] }),
    postBatch({ ...data, records: [{ ...data.records[0], status: "absent" }] }),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(await Attendance.countDocuments()).toBe(1);
  const report = (await request(app).get("/api/reports").set(auth())).body;
  const saved = await Attendance.findOne();
  expect(
    responses.find((response) => response.status === 200).body.records[0]
      .status,
  ).toBe(saved.status);
  expect(report.attendance[0].recorded).toBe(1);
  expect(report.metrics.attendancePercentage).toBe(
    saved.status === "absent" ? 0 : 100,
  );
});
it("rolls back a storage failure after a write inside the transaction", async () => {
  vi.spyOn(Attendance, "bulkWrite").mockImplementationOnce(
    async (operations, options) => {
      await Attendance.create([operations[0].insertOne.document], {
        session: options.session,
      });
      throw new Error("Injected storage failure");
    },
  );
  expect((await postBatch(batch())).status).toBe(500);
  expect(await Attendance.countDocuments()).toBe(0);
});
function importCSV(changes = {}) {
  return csv(
    [0, 1].map((i) =>
      Object.fromEntries(
        studentFields.map((field) => [
          field,
          {
            ...base,
            studentId: "IMPORT-" + i,
            rollNumber: "IMPORT-R" + i,
            firstName: 'Ada, "Example"',
            lastName: "Müller",
            email: "IMPORT" + i + "@example.test",
            phone: "",
            ...changes,
          }[field],
        ]),
      ),
    ),
  );
}
async function preview(input) {
  return request(app)
    .post("/api/students/import/preview")
    .set(auth())
    .send({ csv: input, ignoredColumns: [] });
}
const confirmed = (csvValue, view) => ({
  csv: csvValue,
  mapping: view.mapping,
  ignoredColumns: view.ignoredColumns,
  previewDigest: view.digest,
  requestId: randomUUID(),
  confirm: true,
});
const commit = (data) =>
  request(app).post("/api/students/import").set(auth()).send(data);
it("previews safely without writes, imports quoted Unicode CSV atomically, and replays its receipt", async () => {
  const source = importCSV(),
    view = await preview(source);
  expect(view.status).toBe(200);
  expect(view.body.summary).toEqual({
    total: 2,
    valid: 2,
    invalid: 0,
    duplicates: 0,
  });
  expect(await Student.countDocuments({ studentId: /^IMPORT-/ })).toBe(0);
  const input = confirmed(source, view.body),
    result = await commit(input);
  expect(result.status).toBe(200);
  expect(result.body.created).toBe(2);
  expect((await Student.findOne({ studentId: "IMPORT-0" })).firstName).toBe(
    'Ada, "Example"',
  );
  expect((await Student.findOne({ studentId: "IMPORT-0" })).email).toBe(
    "import0@example.test",
  );
  expect((await commit(input)).body.replayed).toBe(true);
  expect(await Student.countDocuments({ studentId: /^IMPORT-/ })).toBe(2);
  expect(await OperationReceipt.countDocuments()).toBe(1);
});
it("reports duplicate rows and invalid fields and does not import any valid siblings", async () => {
  const source = importCSV({ studentId: "IMPORT-DUP", email: "invalid" }),
    view = (await preview(source)).body;
  expect(view.summary.invalid).toBe(2);
  expect(view.summary.duplicates).toBe(2);
  expect((await commit(confirmed(source, view))).status).toBe(422);
  expect(await Student.countDocuments({ studentId: /^IMPORT-/ })).toBe(0);
});
it("rechecks existing conflicts at commit and rejects changed content or reused request IDs", async () => {
  const source = importCSV(),
    view = (await preview(source)).body,
    input = confirmed(source, view);
  expect(
    (await commit({ ...input, csv: source.replace("Müller", "Changed") }))
      .status,
  ).toBe(409);
  await Student.create({
    ...base,
    studentId: "IMPORT-0",
    rollNumber: "IMPORT-R0",
    firstName: "Existing",
    lastName: "Record",
    email: "import0@example.test",
  });
  expect((await commit(input)).status).toBe(422);
  expect(await Student.countDocuments({ studentId: /^IMPORT-/ })).toBe(1);
  expect((await Student.findOne({ studentId: "IMPORT-0" })).firstName).toBe(
    "Existing",
  );
});
it("requires explicit mapping/ignored columns and rejects malformed, empty and excessive files", async () => {
  for (const source of [
    "",
    "email\n",
    'email\n"unterminated',
    "a,a\n1,2",
    "x".repeat(65537),
  ])
    expect((await preview(source)).status).toBeGreaterThanOrEqual(400);
  const source = importCSV().replace("firstName", "Given name"),
    initial = (await preview(source)).body;
  expect(initial.errors.length).toBeGreaterThan(0);
  const mapped = await request(app)
    .post("/api/students/import/preview")
    .set(auth())
    .send({
      csv: source,
      mapping: { ...initial.mapping, firstName: "Given name" },
    });
  expect(mapped.body.summary.valid).toBe(2);
  const missingHeader = await request(app)
    .post("/api/students/import/preview")
    .set(auth())
    .send({
      csv: source,
      mapping: { ...initial.mapping, firstName: "Does not exist" },
    });
  expect(missingHeader.status).toBe(200);
  expect(
    missingHeader.body.errors.some((issue) =>
      issue.message.includes("not found"),
    ),
  ).toBe(true);
  expect(
    (await commit({ ...confirmed(source, mapped.body), confirm: false }))
      .status,
  ).toBe(422);
  const template = await request(app)
    .get("/api/students/import/template.csv")
    .set(auth());
  expect(template.text.trim()).toBe(studentFields.join(","));
});
it("rolls back an import storage failure including its receipt", async () => {
  const source = importCSV(),
    view = (await preview(source)).body;
  vi.spyOn(Student, "insertMany").mockImplementationOnce(
    async (rows, options) => {
      await Student.create([rows[0]], { session: options.session });
      throw new Error("Injected import failure");
    },
  );
  expect((await commit(confirmed(source, view))).status).toBe(500);
  expect(await Student.countDocuments({ studentId: /^IMPORT-/ })).toBe(0);
  expect(await OperationReceipt.countDocuments()).toBe(0);
});
it("replays concurrent identical import confirmations and rejects request ID reuse for different content", async () => {
  const source = importCSV(),
    view = (await preview(source)).body,
    input = confirmed(source, view);
  const results = await Promise.all([commit(input), commit(input)]);
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  expect(results.map((result) => result.body.replayed).sort()).toEqual([
    false,
    true,
  ]);
  expect(await Student.countDocuments({ studentId: /^IMPORT-/ })).toBe(2);
  const other = importCSV({ firstName: "Different content" }),
    otherView = (await preview(other)).body;
  expect(
    (
      await commit({
        ...confirmed(other, otherView),
        requestId: input.requestId,
      })
    ).status,
  ).toBe(409);
  expect(await OperationReceipt.countDocuments()).toBe(1);
});
it("returns an actionable transaction capability error without writing on unsupported databases", async () => {
  vi.spyOn(mongoose.connection, "transaction").mockRejectedValueOnce(
    Object.assign(new Error("Transactions unsupported"), { code: 20 }),
  );
  const result = await postBatch(batch());
  expect(result.status).toBe(503);
  expect(result.body.message).toContain("replica set");
  expect(await Attendance.countDocuments()).toBe(0);
});
