const field = (key, label, type = "text", options) => ({
  key,
  label,
  type,
  options,
});
const academic = [
  field("department", "Department"),
  field("academicYear", "Academic year"),
  field("semester", "Semester", "number"),
];
const relations = [
  field("student", "Student", "student"),
  field("course", "Course", "course"),
];
export const modules = {
  students: {
    title: "Students",
    singular: "student",
    description: "Manage student records and academic profiles.",
    icon: "students",
    fields: [
      field("studentId", "Student ID"),
      field("rollNumber", "Roll number"),
      field("firstName", "First name"),
      field("lastName", "Last name"),
      field("email", "Email", "email"),
      field("phone", "Phone", "tel"),
      ...academic,
      field("batch", "Batch"),
      field("section", "Section"),
      field("status", "Status", "select", ["active", "inactive", "graduated"]),
    ],
    columns: [
      "studentId",
      "fullName",
      "email",
      "department",
      "academicYear",
      "status",
    ],
  },
  courses: {
    title: "Courses",
    singular: "course",
    description: "Organize your curriculum and teaching assignments.",
    fields: [
      field("code", "Course code"),
      field("name", "Course name"),
      ...academic,
      field("credits", "Credits", "number"),
      field("facultyName", "Faculty name"),
    ],
    columns: [
      "code",
      "name",
      "department",
      "semester",
      "credits",
      "facultyName",
    ],
  },
  enrollments: {
    title: "Enrollments",
    singular: "enrollment",
    description: "Connect students to courses in their academic term.",
    fields: [
      ...relations,
      field("term", "Academic term"),
      field("status", "Status", "select", ["active", "completed", "withdrawn"]),
    ],
    columns: ["student", "course", "term", "status"],
  },
  attendance: {
    title: "Attendance",
    singular: "attendance record",
    description:
      "Record attendance by course and date. Unrecorded sessions are excluded.",
    fields: [
      ...relations,
      field("date", "Session date", "date"),
      field("status", "Status", "select", ["present", "absent", "late"]),
    ],
    columns: ["student", "course", "date", "status"],
  },
  grades: {
    title: "Grades",
    singular: "assessment",
    description:
      "Track assessment results with validated marks and clear grading rules.",
    fields: [
      ...relations,
      field("term", "Academic term"),
      field("assessment", "Assessment name"),
      field("marks", "Marks", "number"),
      field("maxMarks", "Maximum marks", "number"),
    ],
    columns: [
      "student",
      "course",
      "assessment",
      "marks",
      "maxMarks",
      "percentage",
      "letter",
    ],
  },
};
export const label = (key) =>
  ({
    fullName: "Student",
    studentId: "Student ID",
    academicYear: "Academic year",
    facultyName: "Faculty",
    maxMarks: "Maximum",
    letter: "Grade",
    percentage: "Percentage",
    courseEnrollments: "Course enrollments",
    _id: "Category",
  })[key] ||
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
