import {
  Student,
  Course,
  Enrollment,
  Attendance,
  Grade,
  models,
} from "../models/index.js";
import { fail } from "../middleware/auth.js";
import { id } from "../validators/index.js";
// Serialize integrity-sensitive writes in a single API instance. Deploy one instance;
// multi-instance writes require MongoDB transactions and a shared locking policy.
let queue = Promise.resolve();
export function writeExclusive(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
export async function validateRelations(kind, data) {
  if (!["enrollments", "attendance", "grades"].includes(kind)) return;
  const [student, course] = await Promise.all([
    Student.findById(data.student),
    Course.findById(data.course),
  ]);
  if (!student || !course) throw fail(404, "Student or course not found");
  if (
    student.department !== course.department ||
    student.semester !== course.semester ||
    student.academicYear !== course.academicYear
  )
    throw fail(
      422,
      "Student and course must share department, semester, and academic year",
    );
  if (kind === "enrollments") {
    if (data.term !== course.academicYear)
      throw fail(422, "Enrollment term must match the course academic year");
    if (data.status === "active" && student.status !== "active")
      throw fail(422, "Only active students can enroll");
  } else {
    const enrollment = await Enrollment.findOne({
      student: data.student,
      course: data.course,
      term: course.academicYear,
      status: { $in: ["active", "completed"] },
    });
    if (!enrollment || (kind === "grades" && data.term !== enrollment.term))
      throw fail(422, "A valid enrollment for this academic term is required");
  }
}
export async function checkUpdate(kind, record, data) {
  if (kind === "students" || kind === "courses") {
    const fields =
      kind === "students"
        ? ["department", "semester", "academicYear"]
        : ["department", "semester", "academicYear"];
    if (
      fields.some((key) => data[key] !== record[key]) &&
      (await Enrollment.exists({
        [kind === "students" ? "student" : "course"]: record._id,
      }))
    )
      throw fail(
        409,
        "Remove dependent academic records and enrollments before changing department, semester or year",
      );
  }
  if (
    kind === "enrollments" &&
    (data.student !== String(record.student) ||
      data.course !== String(record.course) ||
      data.term !== record.term ||
      data.status === "withdrawn")
  ) {
    if (
      (await Attendance.exists({
        student: record.student,
        course: record.course,
      })) ||
      (await Grade.exists({
        student: record.student,
        course: record.course,
        term: record.term,
      }))
    )
      throw fail(
        409,
        "Remove attendance and grades before changing this enrollment",
      );
  }
}
export async function checkDelete(kind, record) {
  const relation =
    kind === "students"
      ? { student: record._id }
      : kind === "courses"
        ? { course: record._id }
        : kind === "enrollments"
          ? { student: record.student, course: record.course }
          : null;
  if (
    relation &&
    ((await Enrollment.exists(
      kind === "enrollments" ? { _id: null } : relation,
    )) ||
      (await Attendance.exists(relation)) ||
      (await Grade.exists(relation)))
  )
    throw fail(
      409,
      "Remove dependent enrollments, attendance and grades first",
    );
}
export function queryOptions(kind, query) {
  const filter = {};
  for (const key of [
    "department",
    "academicYear",
    "status",
    "semester",
    "student",
    "course",
    "date",
    "term",
  ]) {
    if (query[key] && models[kind].schema.path(key)) {
      if (key === "student" || key === "course") id.parse(query[key]);
      filter[key] = query[key];
    }
  }
  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search
      .trim()
      .slice(0, 120)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fields =
      kind === "students"
        ? ["firstName", "lastName", "studentId", "email", "rollNumber"]
        : kind === "courses"
          ? ["code", "name", "facultyName"]
          : ["term"];
    filter.$or = fields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }));
    if (kind === "students")
      filter.$or.push({
        $expr: {
          $regexMatch: {
            input: {
              $concat: [
                { $ifNull: ["$firstName", ""] },
                " ",
                { $ifNull: ["$lastName", ""] },
              ],
            },
            regex: search,
            options: "i",
          },
        },
      });
  }
  const page = Math.max(1, Math.min(100000, parseInt(query.page) || 1));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 20));
  const allowed = [
    "createdAt",
    "studentId",
    "firstName",
    "lastName",
    "name",
    "code",
    "date",
    "department",
    "academicYear",
  ];
  const sort = allowed.includes(query.sort) ? query.sort : "createdAt";
  return {
    filter,
    page,
    limit,
    sort: { [sort]: query.order === "asc" ? 1 : -1, _id: 1 },
  };
}
