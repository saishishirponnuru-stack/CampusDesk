import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { capture } from "./support/real";
test.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Requires the owned disposable database/API runner",
);
test.use({ actionTimeout: 10000 });
test("complete academic journey persists, reports, exports and revokes access", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const suffix = Date.now() + test.info().project.name;
  const studentCode = "FLOW-" + suffix,
    courseCode = "COURSE-" + suffix.toUpperCase(),
    department = "Lifecycle " + suffix;
  let token;
  const login = async () => {
    await page.getByLabel("Email address").fill(process.env.E2E_ADMIN_EMAIL);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.E2E_ADMIN_PASSWORD);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Sign in to workspace/ }).click();
    token = (await (await response).json()).token;
    await expect(
      page.getByRole("navigation", {
        name: "Main navigation",
        includeHidden: true,
      }),
    ).toBeAttached();
  };
  const nav = async (name) => {
    if (page.viewportSize().width <= 640)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Main navigation", includeHidden: true })
      .getByRole("link", { name, exact: true })
      .click();
  };
  const save = async (kind) => {
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/api/" + kind) &&
        ["POST", "PUT"].includes(r.request().method()),
    );
    await page.getByRole("button", { name: "Save record" }).click();
    const result = await response;
    expect(result.ok()).toBe(true);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    return result.json();
  };
  const fill = async (values) => {
    for (const [name, value] of Object.entries(values))
      await page.getByLabel(name, { exact: true }).fill(value);
  };
  const row = (code) =>
    page
      .locator("tr:visible, article.mobile-record:visible")
      .filter({ hasText: code });
  await page.goto("/");
  await login();
  await nav("Settings");
  await page
    .getByLabel("Thresholds", { exact: true })
    .fill("A:90, B:80, C:70, F:0");
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByText("Grade thresholds saved.")).toBeVisible();
  await nav("Students");
  await page.getByRole("button", { name: "Add student", exact: true }).click();
  await fill({
    "Student ID": studentCode,
    "Roll number": studentCode,
    "First name": "Lifecycle",
    "Last name": "Example",
    Email: suffix + "@example.test",
    Department: department,
    "Academic year": "2026-2027",
    Semester: "1",
    Batch: "2026",
    Section: "A",
  });
  const student = await save("students");
  await page.getByRole("textbox", { name: "Search records" }).fill(studentCode);
  await expect(row(studentCode)).toBeVisible();
  await row(studentCode).getByRole("button", { name: "Edit student" }).click();
  await page.getByLabel("First name", { exact: true }).fill("Persisted");
  await save("students");
  await page.reload();
  await login();
  await page.getByRole("textbox", { name: "Search records" }).fill(studentCode);
  await expect(row(studentCode)).toContainText("Persisted Example");
  await nav("Courses");
  await page.getByRole("button", { name: "Add course", exact: true }).click();
  await fill({
    "Course code": courseCode,
    "Course name": "Lifecycle course " + suffix,
    Department: department,
    "Academic year": "2026-2027",
    Semester: "1",
    Credits: "3",
    "Faculty name": "Dr Synthetic",
  });
  const course = await save("courses");
  const relations = async () => {
    await page.getByLabel("Search student options").fill(studentCode);
    await page.getByLabel("Student", { exact: true }).selectOption(student._id);
    await page.getByLabel("Search course options").fill(courseCode);
    await page.getByLabel("Course", { exact: true }).selectOption(course._id);
  };
  await nav("Enrollments");
  await page
    .getByRole("button", { name: "Add enrollment", exact: true })
    .click();
  await relations();
  await fill({ "Academic term": "2026-2027" });
  await save("enrollments");
  await expect(row("Lifecycle course " + suffix)).toContainText(
    "Persisted Example",
  );
  await nav("Attendance");
  await page
    .getByRole("button", { name: "Add attendance record", exact: true })
    .click();
  await relations();
  await fill({ "Session date": "2026-11-16" });
  await page.getByLabel("Status", { exact: true }).selectOption("present");
  await save("attendance");
  await row("Lifecycle course " + suffix)
    .getByRole("button", { name: "Edit attendance record" })
    .click();
  await page.getByLabel("Status", { exact: true }).selectOption("late");
  await save("attendance");
  await page.reload();
  await login();
  await expect(row("Lifecycle course " + suffix)).toContainText("Late");
  await nav("Grades");
  await page
    .getByRole("button", { name: "Add assessment", exact: true })
    .click();
  await relations();
  await fill({
    "Academic term": "2026-2027",
    "Assessment name": "Midterm",
    Marks: "72",
    "Maximum marks": "80",
  });
  await save("grades");
  await row("Lifecycle course " + suffix)
    .getByRole("button", { name: "Edit assessment" })
    .click();
  await page.getByLabel("Marks", { exact: true }).fill("68");
  await save("grades");
  await expect(row("Lifecycle course " + suffix)).toContainText("85.0%");
  const headers = { Authorization: "Bearer " + token };
  await nav("Dashboard");
  await expect(
    page.getByRole("heading", { name: "Campus overview" }),
  ).toBeVisible();
  const report = await (
    await request.get("http://127.0.0.1:5000/api/reports", { headers })
  ).json();
  expect(report.departments.find((r) => r._id === department).count).toBe(1);
  expect(report.attendance.find((r) => r._id === course._id).percentage).toBe(
    100,
  );
  expect(report.performance.find((r) => r._id === course._id).percentage).toBe(
    85,
  );
  await expect(
    page.getByRole("link", { name: /Total students/ }).locator("strong"),
  ).toHaveText(String(report.metrics.students));
  await nav("Reports");
  await page.getByLabel("Department", { exact: true }).fill(department);
  await page.getByLabel("Academic year", { exact: true }).fill("2026-2027");
  await page.getByLabel("Semester", { exact: true }).selectOption("1");
  await page.getByLabel("Attendance from", { exact: true }).fill("2026-11-16");
  await page
    .getByLabel("Attendance through", { exact: true })
    .fill("2026-11-16");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByText("Filtered results", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Performance", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: course.name, exact: true }),
  ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Color theme").selectOption(theme);
    await capture(page, test, "filtered-reports", theme);
  }
  await expect(page.locator(".history tbody tr")).toHaveCount(1);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe("performance.csv");
  const csv = await readFile(await file.path(), "utf8");
  expect(csv).toContain(course.name);
  expect(csv).toContain('"85"');
  await nav("Settings");
  await page.getByLabel("Thresholds", { exact: true }).fill("Pass:80, Fail:0");
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByText("Grade thresholds saved.")).toBeVisible();
  await nav("Grades");
  await expect(row("Lifecycle course " + suffix)).toContainText("Pass");
  expect(await page.evaluate(() => Object.keys(localStorage))).not.toContain(
    "token",
  );
  if (page.viewportSize().width <= 640)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(
    (
      await request.get("http://127.0.0.1:5000/api/students", { headers })
    ).status(),
  ).toBe(401);
  await page.goto("/students");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
