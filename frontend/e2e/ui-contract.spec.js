import { test, expect } from "@playwright/test";
// Frontend-only API contract fixtures. These do not validate MongoDB or API behavior.
for (const theme of ["light", "dark"])
  test(`workspace navigation, dialogs and empty states work across modules (${theme})`, async ({
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
      else if (
        new URL(route.request().url()).searchParams.get("search") === "Taylor"
      ) {
        body = {
          items:
            path === "/api/students"
              ? [
                  {
                    _id: "a".repeat(24),
                    studentId: "S1",
                    firstName: "Taylor",
                    lastName: "Example",
                    department: "Computing",
                  },
                ]
              : [
                  {
                    _id: "b".repeat(24),
                    code: "CS101",
                    name: "Computing basics",
                    department: "Computing",
                  },
                ],
          total: 1,
          page: 1,
          pages: 1,
        };
      } else body = { items: [], total: 0, page: 1, pages: 0 };
      await route.fulfill({ json: body });
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.getByLabel("Color theme").selectOption(theme);
    await page.getByLabel("Email address").fill("fixture@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("test-fixture-only");
    await page.getByRole("button", { name: /Sign in to workspace/ }).click();
    await expect(
      page.getByRole("heading", { name: "Campus overview" }),
    ).toBeVisible();
    await expect(
      page.getByText("Total students", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Students by department",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/dashboard-${theme}-${test.info().project.name}.png`,
      fullPage: true,
    });
    if (test.info().project.name === "desktop") {
      await page.getByRole("button", { name: "Collapse sidebar" }).click();
      await page.getByRole("button", { name: "Expand sidebar" }).click();
    }
    await page.getByRole("button", { name: "Search workspace" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("textbox", { name: "Search students, courses, or pages" })
      .fill("Taylor");
    await expect(
      page.getByRole("link", { name: /Taylor Example/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: /CS101 · Computing basics/ }).click();
    await expect(
      page.getByRole("textbox", { name: "Search records" }),
    ).toHaveValue("CS101");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(
      page.getByRole("textbox", { name: "Search records" }),
    ).toHaveValue("");
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
      if (module === "Students" || module === "Courses") {
        await page.getByLabel("Filter by semester").selectOption("2");
        await page.getByRole("button", { name: "Clear filters" }).click();
        await expect(page.getByLabel("Filter by semester")).toHaveValue("");
      }
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      if (module === "Students") {
        await page.getByLabel("First name", { exact: true }).fill("Unsaved");
        page.once("dialog", (dialog) => dialog.dismiss());
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeVisible();
        page.once("dialog", (dialog) => dialog.accept());
      }
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
    await page.screenshot({
      path: `test-results/settings-${theme}-${test.info().project.name}.png`,
      fullPage: true,
    });
    for (const width of [320, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          async () =>
            page.evaluate(() => ({
              width: innerWidth,
              page: document.documentElement.scrollWidth,
              overflow: [...document.querySelectorAll("body *")]
                .filter(
                  (el) =>
                    el.getBoundingClientRect().right > innerWidth + 1 &&
                    getComputedStyle(el).visibility !== "hidden",
                )
                .slice(0, 8)
                .map((el) => el.className),
            })),
          { timeout: 3000 },
        )
        .toMatchObject({ width, page: width });
    }
    expect(errors).toEqual([]);
  });
