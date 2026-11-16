import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { parse } from "csv-parse/sync";
import { testDatabase } from "./database.js";
import { createApp } from "../src/app.js";
import { initAdmin } from "../scripts/admin.js";
import {
  Student,
  Course,
  Enrollment,
  Attendance,
  Grade,
} from "../src/models/index.js";
import { csv } from "../src/services/reports.js";
let db, app, headers, courses;
beforeAll(async () => {
  db = await testDatabase();
  app = createApp({
    secret: "reports-isolated-synthetic-secret-longer-than-32",
    logging: false,
  });
  await initAdmin({
    email: "reports@example.test",
    password: "Synthetic-report-password",
  });
  const login = await request(app).post("/api/auth/login").send({
    email: "reports@example.test",
    password: "Synthetic-report-password",
  });
  headers = { Authorization: "Bearer " + login.body.token };
  courses = [];
  for (let i = 0; i < 2; i++) {
    const academic = {
      department: i ? "Mathematics" : "Computing",
      academicYear: i ? "2025-2026" : "2026-2027",
      semester: i + 1,
    };
    const student = await Student.create({
      ...academic,
      studentId: "REPORT-" + i,
      rollNumber: "RR" + i,
      firstName: "Synthetic",
      lastName: String(i),
      email: "report" + i + "@example.test",
      batch: "2026",
      section: "A",
      status: "active",
    });
    const course = await Course.create({
      ...academic,
      code: "RPT" + i,
      name: i ? "Other course" : '=Formula course, "Quoted"',
      credits: 3,
      facultyName: "Dr Synthetic",
    });
    courses.push(course);
    await Enrollment.create({
      student: student._id,
      course: course._id,
      term: academic.academicYear,
      status: "active",
    });
    await Attendance.insertMany(
      ["2026-01-01", "2026-11-16"].map((date, j) => ({
        student: student._id,
        course: course._id,
        date,
        status: j ? "late" : "absent",
      })),
    );
    await Grade.create({
      student: student._id,
      course: course._id,
      term: academic.academicYear,
      assessment: "Exam",
      marks: i ? 20 : 80,
      maxMarks: 100,
    });
  }
}, 120000);
afterAll(async () => {
  await db?.stop();
});
const report = (query = {}) =>
  request(app).get("/api/reports").query(query).set(headers);
it("filters all five aggregates and metrics by actual academic context", async () => {
  const all = (await report()).body;
  expect(all.metrics).toMatchObject({
    students: 2,
    courses: 2,
    enrollments: 2,
    attendancePercentage: 50,
  });
  for (const query of [
    { department: "Computing" },
    { academicYear: "2026-2027" },
    { semester: "1" },
    { course: String(courses[0]._id) },
    { term: "2026-2027" },
  ]) {
    const response = await report(query);
    expect(response.status).toBe(200);
    const data = response.body;
    expect(data.metrics.students).toBe(1);
    expect(data.metrics.courses).toBe(1);
    expect(data.departments).toEqual([{ _id: "Computing", count: 1 }]);
    expect(data.years).toEqual([{ _id: "2026-2027", count: 1 }]);
    for (const type of ["attendance", "performance", "courseEnrollments"]) {
      expect(data[type]).toHaveLength(1);
      expect(data[type][0].course).toBe(courses[0].name);
    }
    expect(data.performance[0].percentage).toBe(80);
    expect(
      data.recentActivity.every((row) => row.id !== String(courses[1]._id)),
    ).toBe(true);
  }
});
it("applies inclusive session dates only to recorded attendance and preserves the missing-session policy", async () => {
  const data = (
    await report({
      course: String(courses[0]._id),
      dateFrom: "2026-11-16",
      dateTo: "2026-11-16",
    })
  ).body;
  expect(data.attendance[0]).toMatchObject({
    recorded: 1,
    attended: 1,
    percentage: 100,
  });
  expect(data.metrics.attendancePercentage).toBe(100);
  expect(data.performance[0].percentage).toBe(80);
  const empty = (await report({ dateFrom: "2027-01-01" })).body;
  expect(empty.attendance).toEqual([]);
  expect(empty.metrics.attendancePercentage).toBeNull();
});
it("does not expand contradictory academic year and term filters", async () => {
  const data = (await report({ academicYear: "2025-2026", term: "2026-2027" }))
    .body;
  expect(data.attendance).toEqual([]);
  expect(data.performance).toEqual([]);
  expect(data.departments).toEqual([]);
});
it("exports identical filtered aggregates with useful headers and safe quoted formula cells", async () => {
  const query = { department: "Computing", dateFrom: "2026-11-16" };
  const data = (await report(query)).body;
  for (const [type, headersExpected] of Object.entries({
    departments: ["department", "count"],
    years: ["academicYear", "count"],
    courseEnrollments: ["course", "count"],
    attendance: ["course", "department", "recorded", "attended", "percentage"],
    performance: ["course", "assessments", "marks", "maxMarks", "percentage"],
  })) {
    const response = await request(app)
      .get(`/api/reports/${type}.csv`)
      .query(query)
      .set(headers);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/csv/);
    const rows = parse(response.text, { bom: true });
    expect(rows[0]).toEqual(headersExpected);
    expect(rows).toHaveLength(2);
    if (headersExpected.includes("course"))
      expect(rows[1][0]).toBe("'" + courses[0].name);
    if (type === "attendance")
      expect(rows[1].slice(2).map(Number)).toEqual([
        data.attendance[0].recorded,
        data.attendance[0].attended,
        data.attendance[0].percentage,
      ]);
    expect(response.text).not.toContain("Other course");
    const empty = await request(app)
      .get(`/api/reports/${type}.csv`)
      .query({ department: "None" })
      .set(headers);
    expect(parse(empty.text, { bom: true })).toEqual([headersExpected]);
  }
  expect(csv([{ v: "  =1+1" }])).toContain("'  =1+1");
});
it("rejects malformed filters and protects all exports", async () => {
  for (const query of [
    { semester: "13" },
    { course: "invalid" },
    { dateFrom: "2026-02-30" },
    { dateFrom: "2026-11-17", dateTo: "2026-01-01" },
    { unknown: "x" },
    { department: { $ne: "Computing" } },
  ]) {
    expect((await report(query)).status).toBe(422);
    expect(
      (
        await request(app)
          .get("/api/reports/attendance.csv")
          .query(query)
          .set(headers)
      ).status,
    ).toBe(422);
  }
  expect((await request(app).get("/api/reports/attendance.csv")).status).toBe(
    401,
  );
  expect(
    (await request(app).get("/api/reports/toString.csv").set(headers)).status,
  ).toBe(404);
});
