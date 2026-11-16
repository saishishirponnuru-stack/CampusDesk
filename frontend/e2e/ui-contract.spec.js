import { test, expect } from "@playwright/test";
// Frontend-only API contract fixtures. These do not validate MongoDB or API behavior.
test("workspace navigation, dialogs and empty states work across modules", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if (path === "/api/auth/login")
      body = { token: "test-fixture-token", expiresIn: 900 };
    else if (path === "/api/auth/me")
      body = {
        name: "Test Administrator",
        email: "fixture@example.test",
        thresholds: [
          { label: "Pass", minimum: 50 },
          { label: "Fail", minimum: 0 },
        ],
      };
    else if (path === "/api/reports")
      body = {
        metrics: {
          students: 0,
          activeStudents: 0,
          courses: 0,
          enrollments: 0,
          attendancePercentage: null,
        },
        departments: [],
        years: [],
        enrollmentTrends: [],
        attendance: [],
        performance: [],
        courseEnrollments: [],
        recentStudents: [],
      };
    else body = { items: [], total: 0, page: 1, pages: 0 };
    await route.fulfill({ json: body });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Email address").fill("fixture@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-fixture-only");
  await page.getByRole("button", { name: /Sign in to workspace/ }).click();
  await expect(
    page.getByRole("heading", { name: "Campus overview" }),
  ).toBeVisible();
  await expect(page.getByText("Total students", { exact: true })).toBeVisible();
  for (const [module, button] of [
    ["Students", "Add student"],
    ["Courses", "Add course"],
    ["Enrollments", "Add enrollment"],
    ["Attendance", "Add attendance record"],
    ["Grades", "Add assessment"],
  ]) {
    if (test.info().project.name === "mobile")
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: module, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: module, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Nothing here yet")).toBeVisible();
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Reports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Academic reports" }),
  ).toBeVisible();
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Administrator profile" }),
  ).toBeVisible();
  await expect(page.getByLabel("Thresholds")).toHaveValue("Pass:50, Fail:0");
  expect(errors).toEqual([]);
});
