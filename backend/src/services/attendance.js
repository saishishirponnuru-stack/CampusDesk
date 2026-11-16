import mongoose from "mongoose";
import { Course, Student, Enrollment, Attendance } from "../models/index.js";
import { fail } from "../middleware/auth.js";
import { atomic, invalid } from "./transactions.js";
export async function attendanceRegister({
  course: courseId,
  date,
  page,
  limit,
}) {
  const course = await Course.findById(courseId).lean();
  if (!course) throw fail(404, "Course not found");
  const [roster] = await Enrollment.aggregate([
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
        term: course.academicYear,
        status: { $in: ["active", "completed"] },
      },
    },
    {
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    {
      $match: {
        "student.department": course.department,
        "student.semester": course.semester,
        "student.academicYear": course.academicYear,
      },
    },
    {
      $project: {
        _id: 0,
        student: {
          _id: "$student._id",
          firstName: "$student.firstName",
          lastName: "$student.lastName",
          studentId: "$student.studentId",
        },
      },
    },
    {
      $facet: {
        items: [
          { $sort: { "student.studentId": 1, "student._id": 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        total: [{ $count: "value" }],
      },
    },
  ]);
  const records = await Attendance.find({
    course: courseId,
    date,
    student: { $in: roster.items.map((row) => row.student._id) },
  })
    .select("student status revision updatedAt")
    .lean();
  const byStudent = new Map(
    records.map((row) => [
      String(row.student),
      { ...row, revision: row.revision ?? 0 },
    ]),
  );
  const total = roster.total[0]?.value || 0;
  return {
    course: {
      _id: course._id,
      code: course.code,
      name: course.name,
      department: course.department,
      academicYear: course.academicYear,
      semester: course.semester,
    },
    date,
    items: roster.items.map((row) => ({
      ...row,
      attendance: byStudent.get(String(row.student._id)) || null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}
export async function saveAttendance(batch) {
  return atomic(async (session) => {
    const course = await Course.findById(batch.course).session(session).lean();
    if (!course) throw fail(404, "Course not found");
    const ids = batch.records.map((row) => row.student);
    const students = await Student.find({ _id: { $in: ids } })
      .select("department semester academicYear")
      .session(session)
      .lean();
    const enrollments = await Enrollment.find({
      student: { $in: ids },
      course: batch.course,
      term: course.academicYear,
      status: { $in: ["active", "completed"] },
    })
      .select("student")
      .session(session)
      .lean();
    const current = await Attendance.find({
      student: { $in: ids },
      course: batch.course,
      date: batch.date,
    })
      .session(session)
      .lean();
    const byStudent = new Map(students.map((row) => [String(row._id), row])),
      eligible = new Set(enrollments.map((row) => String(row.student))),
      existing = new Map(current.map((row) => [String(row.student), row]));
    const issues = batch.records.flatMap((row) => {
      const s = byStudent.get(row.student);
      return !s ||
        !eligible.has(row.student) ||
        s.department !== course.department ||
        s.semester !== course.semester ||
        s.academicYear !== course.academicYear
        ? [
            {
              student: row.student,
              message:
                "A compatible active or completed enrollment is required",
            },
          ]
        : [];
    });
    if (issues.length)
      throw invalid(
        422,
        "The batch was not saved. Correct the ineligible records.",
        issues,
      );
    const conflicts = batch.records.filter((row) => {
      const found = existing.get(row.student);
      return (
        found?.status !== row.status &&
        (found
          ? (found.revision ?? 0) !== row.expectedRevision
          : row.expectedRevision !== null)
      );
    });
    if (conflicts.length)
      throw invalid(
        409,
        "Attendance changed since this register was loaded. Reload before saving. No rows were saved.",
        conflicts.map((row) => ({
          student: row.student,
          message: "Revision conflict",
        })),
      );
    let created = 0,
      updated = 0,
      unchanged = 0;
    const operations = [];
    for (const row of batch.records) {
      const found = existing.get(row.student);
      if (found?.status === row.status) {
        unchanged++;
        continue;
      }
      if (found) {
        updated++;
        operations.push({
          updateOne: {
            filter: { _id: found._id },
            update: { $set: { status: row.status }, $inc: { revision: 1 } },
          },
        });
      } else {
        created++;
        operations.push({
          insertOne: {
            document: {
              student: row.student,
              course: batch.course,
              date: batch.date,
              status: row.status,
              revision: 1,
            },
          },
        });
      }
    }
    if (operations.length)
      await Attendance.bulkWrite(operations, { session, ordered: true });
    const records = await Attendance.find({
      student: { $in: ids },
      course: batch.course,
      date: batch.date,
    })
      .select("student status revision updatedAt")
      .session(session)
      .lean();
    return {
      created,
      updated,
      unchanged,
      total: batch.records.length,
      records: records.map((row) => ({ ...row, revision: row.revision ?? 0 })),
    };
  });
}
