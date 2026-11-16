// Fictional API CONTRACT fixtures only. Never imported by application code.
export const student = {
  _id: "a".repeat(24),
  studentId: "NOVA-001",
  rollNumber: "CS-024",
  firstName: "Avery",
  lastName: "Morgan",
  email: "avery@example.test",
  phone: "",
  department: "Computer Science",
  academicYear: "2026-2027",
  semester: 3,
  batch: "2025",
  section: "A",
  status: "active",
  createdAt: "2026-11-12T10:00:00Z",
  updatedAt: "2026-11-14T10:00:00Z",
};
export const course = {
  _id: "b".repeat(24),
  code: "CS201",
  name: "Data structures & algorithms",
  department: "Computer Science",
  academicYear: "2026-2027",
  semester: 3,
  credits: 4,
  facultyName: "Dr. Jordan Ellis",
};
export const students = [
  student,
  ...[
    ["Maya", "Chen", "Business", "active"],
    ["Noah", "Rivera", "Design", "active"],
    ["Isla", "Patel", "Computer Science", "inactive"],
  ].map(([firstName, lastName, department, status], i) => ({
    ...student,
    _id: String(i + 1).repeat(24),
    studentId: "NOVA-00" + (i + 2),
    rollNumber: "R-00" + (i + 2),
    firstName,
    lastName,
    department,
    status,
    email: firstName.toLowerCase() + "@example.test",
  })),
];
export const courses = [
  course,
  {
    ...course,
    _id: "c".repeat(24),
    code: "DS102",
    name: "Design thinking",
    department: "Design",
    facultyName: "Prof. Casey Reed",
  },
  {
    ...course,
    _id: "d".repeat(24),
    code: "BA101",
    name: "Business foundations",
    department: "Business",
    facultyName: "Dr. Robin Blake",
  },
];
export const enrollment = {
  _id: "e".repeat(24),
  student,
  course,
  term: "2026-2027",
  status: "active",
};
export const attendance = {
  _id: "f".repeat(24),
  student,
  course,
  date: "2026-11-14",
  status: "present",
};
export const grade = {
  _id: "9".repeat(24),
  student,
  course,
  term: "2026-2027",
  assessment: "Midterm",
  marks: 84,
  maxMarks: 100,
  percentage: 84,
  letter: "B",
};
const report = {
  metrics: {
    students: 4,
    activeStudents: 3,
    courses: 3,
    enrollments: 1,
    attendancePercentage: 100,
  },
  departments: [
    { _id: "Business", count: 1 },
    { _id: "Computer Science", count: 2 },
    { _id: "Design", count: 1 },
  ],
  years: [{ _id: "2026-2027", count: 4 }],
  enrollmentTrends: [{ _id: "2026-11", count: 1 }],
  attendance: [
    {
      _id: course._id,
      course: course.name,
      department: course.department,
      recorded: 1,
      attended: 1,
      percentage: 100,
    },
  ],
  performance: [
    {
      _id: course._id,
      course: course.name,
      marks: 84,
      maxMarks: 100,
      assessments: 1,
      percentage: 84,
    },
  ],
  courseEnrollments: [{ _id: course._id, course: course.name, count: 1 }],
  recentStudents: students,
  recentActivity: [
    {
      id: grade._id,
      module: "grades",
      title: "Assessment",
      detail: "Midterm",
      updatedAt: "2026-11-14T10:00:00Z",
    },
    {
      id: student._id,
      module: "students",
      title: "Student record",
      detail: student.studentId,
      updatedAt: student.updatedAt,
    },
  ],
};
export async function fixtureAPI(page) {
  const writes = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    if (route.request().method() !== "GET") {
      writes.push({
        path,
        method: route.request().method(),
        body: route.request().postDataJSON(),
      });
      return route.fulfill({
        json: path.endsWith("login")
          ? { token: "fixture-only-token", expiresIn: 900 }
          : {},
      });
    }
    if (path.endsWith(".csv"))
      return route.fulfill({
        contentType: "text/csv",
        body: '"Category","count"\n"Computer Science","2"',
      });
    if (path === "/api/auth/me")
      return route.fulfill({
        json: {
          name: "Alex Taylor",
          email: "admin@example.test",
          thresholds: [
            { label: "A", minimum: 90 },
            { label: "B", minimum: 80 },
            { label: "C", minimum: 70 },
            { label: "F", minimum: 0 },
          ],
        },
      });
    if (path === "/api/reports") return route.fulfill({ json: report });
    if (path.endsWith("/history"))
      return route.fulfill({
        json: {
          student,
          enrollments: [enrollment],
          attendance: [attendance],
          grades: [grade],
          attendancePercentage: 100,
          historyLimit: 500,
        },
      });
    if (/\/courses\/[a-f\d]{24}$/.test(path))
      return route.fulfill({ json: course });
    const kind = path.split("/")[2];
    let items =
      {
        students,
        courses,
        enrollments: [enrollment],
        attendance: [attendance],
        grades: [grade],
      }[kind] || [];
    const search = url.searchParams.get("search")?.toLowerCase();
    if (search)
      items = items.filter((item) =>
        [
          item.firstName,
          item.lastName,
          item.studentId,
          item.name,
          item.code,
          item.email,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search)),
      );
    for (const key of ["department", "semester", "academicYear", "status"])
      if (url.searchParams.get(key))
        items = items.filter(
          (item) => String(item[key]) === url.searchParams.get(key),
        );
    await route.fulfill({
      json: {
        items,
        total: items.length,
        page: 1,
        pages: items.length ? 1 : 0,
      },
    });
  });
  return writes;
}
export async function signIn(page) {
  await page.getByLabel("Email address").fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-only-password");
  await page.getByRole("button", { name: /Sign in to workspace/ }).click();
}
