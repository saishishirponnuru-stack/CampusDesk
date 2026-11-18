import { test, expect } from "@playwright/test";
import { fixtureAPI, signIn, student, course } from "./fixtures/nova";
for (const theme of ["light", "dark"])
  test(`Nova populated visual and interaction review (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await fixtureAPI(page);
    const capture = async (name) => {
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(page.viewportSize().width);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `test-results/nova-${name}-${theme}-${test.info().project.name}.png`,
        fullPage: !["student-form", "search"].includes(name),
        animations: "disabled",
        scale: "css",
      });
    };
    const navigate = async (name) => {
      if (page.viewportSize().width <= 640)
        await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name, exact: true })
        .click();
    };
    await page.goto("/");
    await page.getByLabel("Color theme").selectOption(theme);
    await capture("login");
    await signIn(page);
    await expect(
      page.getByRole("heading", { name: "Campus overview" }),
    ).toBeVisible();
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible();
    await capture("dashboard");
    await navigate("Students");
    await expect(
      page.getByRole("heading", { name: "Students", exact: true }),
    ).toBeVisible();
    await capture("students");
    await page
      .getByRole("button", { name: "Add student", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save record" }),
    ).toBeInViewport({ ratio: 1 });
    await capture("student-form");
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Avery Morgan", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Avery Morgan" }),
    ).toBeVisible();
    await capture("student-profile");
    await page
      .getByRole("button", { name: "Academic results", exact: true })
      .click();
    await expect(page.getByRole("cell", { name: "84.0%" })).toBeVisible();
    await navigate("Courses");
    await capture("courses");
    await page
      .getByRole("link", {
        name: test.info().project.name === "mobile" ? course.name : course.code,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Course roster" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Avery Morgan", exact: true }),
    ).toBeVisible();
    await capture("course-profile");
    for (const name of [
      "Enrollments",
      "Attendance",
      "Grades",
      "Reports",
      "Settings",
    ]) {
      await navigate(name);
      await expect(
        page.getByRole("heading", {
          name: name === "Reports" ? "Academic reports" : name,
          exact: true,
        }),
      ).toBeVisible();
      await capture(name.toLowerCase());
    }
    await navigate("Reports");
    await page
      .getByRole("button", { name: "Performance", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Performance overview" }),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    expect((await download).suggestedFilename()).toBe("performance.csv");
    await page.getByRole("button", { name: "Search workspace" }).click();
    const input = page.getByRole("textbox", {
      name: "Search students, courses, or pages",
    });
    await input.fill("Avery");
    await expect(
      page.getByRole("link", { name: /Avery Morgan/ }),
    ).toBeVisible();
    await capture("search");
    await input.press("ArrowDown");
    await expect(
      page.getByRole("link", { name: /Avery Morgan/ }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Avery Morgan" }),
    ).toBeVisible();
    if (test.info().project.name === "mobile") {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(
        page.getByRole("button", { name: "Close navigation" }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(
        page.getByRole("button", { name: "Log out", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Open navigation" }),
      ).toBeFocused();
    }
    await navigate("Settings");
    for (const width of [320, 375, 390, 768, 1024, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
    }
    await page.setViewportSize({ width: 320, height: 900 });
    for (const name of ["Students", "Courses", "Attendance", "Grades"]) {
      await navigate(name);
      await expect(page.locator(".mobile-record").first()).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(320);
    }
    expect(errors).toEqual([]);
  });
