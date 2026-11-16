import mongoose from "mongoose";
const { Schema } = mongoose;
const text = { type: String, required: true, trim: true };
const ref = (model) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required: true,
  index: true,
});
const options = { timestamps: true, versionKey: false };
const admin = new Schema(
  {
    name: text,
    email: { ...text, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
    thresholds: {
      type: [{ label: String, minimum: Number, _id: false }],
      default: [
        { label: "A", minimum: 90 },
        { label: "B", minimum: 80 },
        { label: "C", minimum: 70 },
        { label: "D", minimum: 60 },
        { label: "F", minimum: 0 },
      ],
    },
  },
  options,
);
const student = new Schema(
  {
    studentId: { ...text, unique: true },
    rollNumber: { ...text, unique: true },
    firstName: text,
    lastName: text,
    email: { ...text, unique: true, lowercase: true },
    phone: { type: String, default: "" },
    department: text,
    batch: text,
    academicYear: text,
    semester: { type: Number, min: 1, max: 12, required: true },
    section: text,
    status: {
      type: String,
      enum: ["active", "inactive", "graduated"],
      default: "active",
    },
  },
  options,
);
student.index({ department: 1, academicYear: 1, status: 1 });
const course = new Schema(
  {
    code: { ...text, uppercase: true, unique: true },
    name: text,
    department: text,
    semester: { type: Number, min: 1, max: 12, required: true },
    credits: { type: Number, min: 1, max: 10, required: true },
    facultyName: text,
    academicYear: text,
  },
  options,
);
course.index({ department: 1, academicYear: 1, semester: 1 });
const enrollment = new Schema(
  {
    student: ref("Student"),
    course: ref("Course"),
    term: text,
    status: {
      type: String,
      enum: ["active", "completed", "withdrawn"],
      default: "active",
    },
  },
  options,
);
enrollment.index({ student: 1, course: 1, term: 1 }, { unique: true });
enrollment.index({ course: 1, term: 1, status: 1, student: 1 });
const attendance = new Schema(
  {
    student: ref("Student"),
    course: ref("Course"),
    date: { type: String, required: true },
    revision: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: true,
    },
  },
  options,
);
attendance.index({ student: 1, course: 1, date: 1 }, { unique: true });
attendance.index({ course: 1, date: 1, student: 1 });
const grade = new Schema(
  {
    student: ref("Student"),
    course: ref("Course"),
    term: text,
    assessment: text,
    marks: { type: Number, min: 0, required: true },
    maxMarks: { type: Number, min: 1, required: true },
  },
  options,
);
grade.index({ course: 1, term: 1 });
grade.pre("validate", function () {
  if (this.marks > this.maxMarks)
    this.invalidate("marks", "Marks cannot exceed maximum marks");
});
grade.index(
  { student: 1, course: 1, term: 1, assessment: 1 },
  { unique: true },
);
export const Admin = mongoose.model("Admin", admin);
export const Student = mongoose.model("Student", student);
export const Course = mongoose.model("Course", course);
export const Enrollment = mongoose.model("Enrollment", enrollment);
export const Attendance = mongoose.model("Attendance", attendance);
export const Grade = mongoose.model("Grade", grade);
export const models = {
  students: Student,
  courses: Course,
  enrollments: Enrollment,
  attendance: Attendance,
  grades: Grade,
};

const receipt = new Schema({
  actor: ref("Admin"),
  requestId: text,
  hash: text,
  result: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});
receipt.index({ actor: 1, requestId: 1 }, { unique: true });
receipt.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
export const OperationReceipt = mongoose.model("OperationReceipt", receipt);
