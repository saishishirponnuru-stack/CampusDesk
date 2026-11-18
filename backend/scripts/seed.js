import "dotenv/config";
import mongoose from "mongoose";
import {
  Student,
  Course,
  Enrollment,
  Attendance,
  Grade,
} from "../src/models/index.js";
export async function seed() {
  for (let i = 1; i <= 36; i++) {
    const d = (i - 1) % 3,
      department = ["Computer Science", "Business", "Engineering"][d],
      academicYear = "2026-2027";
    const student = await Student.findOneAndUpdate(
      { studentId: "DEMO-" + String(i).padStart(3, "0") },
      {
        $setOnInsert: {
          rollNumber: "DEMO-R" + i,
          firstName: ["Avery", "Morgan", "Jordan", "Riley", "Taylor", "Casey"][
            i % 6
          ],
          lastName: "Example " + i,
          email: "student" + i + "@example.test",
          phone: "",
          department,
          batch: "2026",
          academicYear,
          semester: 1,
          section: "A",
          status: "active",
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
    for (let j = 1; j <= 2; j++) {
      const course = await Course.findOneAndUpdate(
        { code: "DEMO-" + ["CS", "BUS", "ENG"][d] + j },
        {
          $setOnInsert: {
            name: [
              ["Programming Foundations", "Data Literacy"],
              ["Business Essentials", "Accounting Principles"],
              ["Engineering Mathematics", "Applied Physics"],
            ][d][j - 1],
            department,
            academicYear,
            semester: 1,
            credits: 3,
            facultyName: ["Dr. Avery Example", "Dr. Morgan Example"][j - 1],
          },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
      await Enrollment.updateOne(
        { student: student._id, course: course._id, term: academicYear },
        { $setOnInsert: { status: "active" } },
        { upsert: true },
      );
      for (let day = 1; day <= 5; day++)
        await Attendance.updateOne(
          { student: student._id, course: course._id, date: "2026-11-0" + day },
          {
            $setOnInsert: {
              status:
                (i + day) % 5 === 0
                  ? "absent"
                  : (i + day) % 7 === 0
                    ? "late"
                    : "present",
            },
          },
          { upsert: true },
        );
      await Grade.updateOne(
        {
          student: student._id,
          course: course._id,
          term: academicYear,
          assessment: "Foundations assessment",
        },
        { $setOnInsert: { marks: 50 + i, maxMarks: 100 } },
        { upsert: true },
      );
    }
  }
}
if (process.argv[1]?.endsWith("/seed.js")) {
  if (process.env.CONFIRM_DEMO_SEED !== "yes")
    throw new Error(
      "Set CONFIRM_DEMO_SEED=yes for an explicitly chosen non-production database",
    );
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seeding is disabled in production");
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all(
      [Student, Course, Enrollment, Attendance, Grade].map((m) => m.init()),
    );
    await seed();
    console.log("Synthetic demo records ready");
  } finally {
    await mongoose.disconnect();
  }
}
