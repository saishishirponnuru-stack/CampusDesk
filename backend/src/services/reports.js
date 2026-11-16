import mongoose from "mongoose";
import {
  Student,
  Course,
  Enrollment,
  Attendance,
  Grade,
} from "../models/index.js";
export async function reports(query = {}) {
  const academic = Object.fromEntries(
    ["department", "academicYear", "semester"]
      .filter((key) => query[key] !== undefined)
      .map((key) => [key, query[key]]),
  );
  const courseFilter = {
    ...academic,
    ...(query.term ? { $and: [{ academicYear: query.term }] } : {}),
    ...(query.course ? { _id: new mongoose.Types.ObjectId(query.course) } : {}),
  };
  const courseIds = Object.keys(courseFilter).length
    ? await Course.distinct("_id", courseFilter)
    : null;
  const courseScope = courseIds ? { course: { $in: courseIds } } : {};
  const enrollmentScope = {
    ...courseScope,
    ...(query.term ? { term: query.term } : {}),
  };
  const studentFilter = { ...academic };
  // Course/term selections scope student distributions to non-withdrawn enrollments.
  if (query.course || query.term)
    studentFilter._id = {
      $in: await Enrollment.distinct("student", {
        ...enrollmentScope,
        status: { $ne: "withdrawn" },
      }),
    };
  const attendanceScope = { ...courseScope };
  if (query.dateFrom || query.dateTo)
    attendanceScope.date = {
      ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
      ...(query.dateTo ? { $lte: query.dateTo } : {}),
    };
  const performanceScope = {
    ...courseScope,
    ...(query.term ? { term: query.term } : {}),
  };
  const nonWithdrawn = { ...enrollmentScope, status: { $ne: "withdrawn" } };
  const [
    students,
    activeStudents,
    courses,
    enrollments,
    departments,
    years,
    enrollmentTrends,
    attendance,
    performance,
    courseEnrollments,
    recentStudents,
  ] = await Promise.all([
    Student.countDocuments(studentFilter),
    Student.countDocuments({ ...studentFilter, status: "active" }),
    Course.countDocuments(courseFilter),
    Enrollment.countDocuments(nonWithdrawn),
    Student.aggregate([
      { $match: studentFilter },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Student.aggregate([
      { $match: studentFilter },
      { $group: { _id: "$academicYear", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Enrollment.aggregate([
      { $match: enrollmentScope },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Attendance.aggregate([
      { $match: attendanceScope },
      {
        $group: {
          _id: "$course",
          recorded: { $sum: 1 },
          attended: {
            $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $project: {
          course: "$course.name",
          department: "$course.department",
          recorded: 1,
          attended: 1,
          percentage: {
            $multiply: [{ $divide: ["$attended", "$recorded"] }, 100],
          },
        },
      },
    ]),
    Grade.aggregate([
      { $match: performanceScope },
      {
        $group: {
          _id: "$course",
          marks: { $sum: "$marks" },
          maxMarks: { $sum: "$maxMarks" },
          assessments: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $project: {
          course: "$course.name",
          marks: 1,
          maxMarks: 1,
          assessments: 1,
          percentage: {
            $multiply: [{ $divide: ["$marks", "$maxMarks"] }, 100],
          },
        },
      },
    ]),
    Enrollment.aggregate([
      { $match: enrollmentScope },
      { $match: { status: { $ne: "withdrawn" } } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      { $project: { course: "$course.name", count: 1 } },
    ]),
    Student.find(studentFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName studentId createdAt")
      .lean(),
  ]);
  const activityGroups = await Promise.all(
    [
      [Student, "students", "Student record", "studentId", studentFilter],
      [Course, "courses", "Course record", "code", courseFilter],
      [Enrollment, "enrollments", "Enrollment", "term", enrollmentScope],
      [Attendance, "attendance", "Attendance record", "date", attendanceScope],
      [Grade, "grades", "Assessment", "assessment", performanceScope],
    ].map(async ([model, module, title, field, filter]) =>
      (
        await model
          .find(filter)
          .sort({ updatedAt: -1 })
          .limit(5)
          .select(field + " updatedAt")
          .lean()
      ).map((record) => ({
        id: String(record._id),
        module,
        title,
        detail: record[field],
        updatedAt: record.updatedAt,
      })),
    ),
  );
  const recentActivity = activityGroups
    .flat()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8);
  const recorded = attendance.reduce((n, r) => n + r.recorded, 0),
    attended = attendance.reduce((n, r) => n + r.attended, 0);
  return {
    metrics: {
      students,
      activeStudents,
      courses,
      enrollments,
      attendancePercentage: recorded ? (attended / recorded) * 100 : null,
    },
    departments,
    years,
    enrollmentTrends,
    attendance,
    performance,
    courseEnrollments,
    recentStudents,
    recentActivity,
  };
}
export const gradeLabel = (percentage, thresholds) =>
  [...thresholds]
    .sort((a, b) => b.minimum - a.minimum)
    .find((t) => percentage >= t.minimum)?.label ?? "—";
export const reportColumns = {
  departments: ["department", "count"],
  years: ["academicYear", "count"],
  courseEnrollments: ["course", "count"],
  attendance: ["course", "department", "recorded", "attended", "percentage"],
  performance: ["course", "assessments", "marks", "maxMarks", "percentage"],
};
export function reportCsv(type, rows) {
  return csv(
    rows.map((row) =>
      type === "departments"
        ? { department: row._id, count: row.count }
        : type === "years"
          ? { academicYear: row._id, count: row.count }
          : row,
    ),
    reportColumns[type],
  );
}
export function csv(rows, columns) {
  const keys =
    columns ||
    (rows.length ? Object.keys(rows[0]).filter((k) => k !== "_id") : []);
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^(?:\s*[=+@-]|[\t\r])/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      keys.map(cell).join(","),
      ...rows.map((row) => keys.map((k) => cell(row[k])).join(",")),
    ].join("\r\n")
  );
}
