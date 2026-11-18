import { test, expect } from "@playwright/test";
import { login, navigate, post } from "./support/real";
test.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Requires owned isolated API",
);
async function shot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(page.viewportSize().width);
  await page.screenshot({
    path: `test-results/spectrum-${name}-${test.info().project.name}.png`,
    fullPage: !(await page.getByRole("dialog").count()),
    animations: "disabled",
  });
}
test("Spectrum paginated pickers, stable selection and enrollment compatibility", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  if (test.info().project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 900 });
  const headers = await login(page),
    tag = Date.now() + test.info().project.name,
    prefix = "SP-" + tag + "-",
    department = "Spectrum " + tag;
  const theme = test.info().project.name === "mobile" ? "dark" : "light";
  await page.getByLabel("Color theme").selectOption(theme);
  const started = Date.now();
  for (let start = 0; start < 105; start += 5)
    await Promise.all(
      Array.from({ length: Math.min(5, 105 - start) }, (_, offset) => {
        const i = start + offset;
        return post(request, "/students", headers, {
          studentId: prefix + String(i).padStart(3, "0"),
          rollNumber: prefix + String(i).padStart(3, "0"),
          firstName: "Synthetic",
          lastName: "Student " + String(i).padStart(3, "0"),
          email: `sp${tag}${i}@example.test`,
          department,
          academicYear: "2026-2027",
          semester: 1,
          batch: "2026",
          section: "A",
          status: "active",
        });
      }),
    );
  const good = await post(request, "/courses", headers, {
    code: "SP" + tag + "OK",
    name: "Spectrum compatible course",
    department,
    academicYear: "2026-2027",
    semester: 1,
    credits: 3,
    facultyName: "Dr Fictional",
  });
  const wrong = await post(request, "/courses", headers, {
    code: "SP" + tag + "BAD",
    name: "Spectrum other semester",
    department,
    academicYear: "2026-2027",
    semester: 2,
    credits: 3,
    facultyName: "Dr Fictional",
  });
  await navigate(page, "Enrollments");
  await page
    .getByRole("button", { name: "Add enrollment", exact: true })
    .click();
  const input = page.getByRole("combobox", { name: "Student", exact: true });
  const searchStarted = Date.now();
  await input.fill(prefix);
  await expect(page.locator(".entity-results").getByRole("option")).toHaveCount(
    20,
  );
  await input.press("Tab");
  await expect(
    page.getByRole("button", { name: "Load more students" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await input.click();
  await input.fill(prefix);
  await expect(page.locator(".entity-results").getByRole("option")).toHaveCount(
    20,
  );
  await shot(page, "student-picker-" + theme);
  for (let p = 0; p < 5; p++) {
    const more = page.getByRole("button", {
      name: "Load more students",
      exact: true,
    });
    await expect(more).toHaveAttribute("aria-disabled", "false");
    await more.click();
  }
  await expect(page.getByRole("option", { name: /Student 104/ })).toBeVisible();
  expect(
    await page.locator(".entity-results").getByRole("option").count(),
  ).toBeLessThanOrEqual(100);
  await input.press("End");
  await input.press("Enter");
  await expect(
    page.locator(".selected-entity").filter({ hasText: "Student 104" }),
  ).toBeVisible();
  await input.fill("Synthetic Student 104");
  await expect(page.locator(".entity-results").getByRole("option")).toHaveCount(
    1,
  );
  await expect(
    page
      .locator(".entity-results")
      .getByRole("option", { name: /Student 104/ }),
  ).toBeVisible();
  await input.fill("No matching identifier anywhere");
  await expect(page.getByText(/No matching students/)).toBeVisible();
  await expect(
    page.locator(".selected-entity").filter({ hasText: "Student 104" }),
  ).toBeVisible();
  await input.press("Escape");
  await page
    .getByRole("combobox", { name: "Course", exact: true })
    .fill(wrong.code);
  await page.getByRole("option", { name: /Spectrum other semester/ }).click();
  await page.getByLabel("Academic term", { exact: true }).fill("2026-2027");
  await expect(page.getByText("Check academic compatibility")).toBeVisible();
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Course", exact: true })
    .fill(good.code);
  await page
    .getByRole("option", { name: /Spectrum compatible course/ })
    .click();
  await expect(page.getByText("Academic context matches")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  await shot(page, "compatible-enrollment-" + theme);
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/enrollments") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save record" }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const persisted = await (
    await request.get(
      "http://127.0.0.1:5000/api/enrollments?course=" + good._id,
      { headers },
    )
  ).json();
  expect(persisted.total).toBe(1);
  console.log(
    JSON.stringify({
      spectrumSyntheticStudents: 105,
      fixtureSetupMs: searchStarted - started,
      pickerJourneyMs: Date.now() - searchStarted,
      device: test.info().project.name,
    }),
  );
});
test("Spectrum structured grading, refresh safety, route protection and API retry", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const headers = await login(page);
  await navigate(page, "Settings");
  await page.getByLabel("Grade label 1", { exact: true }).fill("Distinction");
  const external = await request.put(
    "http://127.0.0.1:5000/api/auth/thresholds",
    {
      headers,
      data: {
        thresholds: [
          { label: "Remote", minimum: 80 },
          { label: "Fail", minimum: 0 },
        ],
      },
    },
  );
  expect(external.ok()).toBe(true);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.getByLabel("Grade label 1", { exact: true })).toHaveValue(
    "Distinction",
  );
  const count = await page.locator(".threshold-row").count();
  await page
    .getByLabel(`Minimum percentage ${count}`, { exact: true })
    .fill("5");
  await expect(page.getByRole("alert")).toContainText("zero boundary");
  await expect(
    page.getByRole("button", { name: "Save thresholds" }),
  ).toBeDisabled();
  await page
    .getByLabel(`Minimum percentage ${count}`, { exact: true })
    .fill("0");
  await page.getByRole("button", { name: "Add grade" }).click();
  await page
    .getByLabel(`Grade label ${count + 1}`, { exact: true })
    .fill("Developing");
  await page
    .getByLabel(`Minimum percentage ${count + 1}`, { exact: true })
    .fill("55");
  await page
    .getByRole("button", { name: `Remove boundary ${count + 1}`, exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByLabel("Grade label 1", { exact: true })).toHaveValue(
    "Distinction",
  );
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Color theme").selectOption(theme);
    await shot(page, "structured-grading-" + theme);
  }
  let failed = false;
  await page.route("**/api/auth/thresholds", (route) => {
    if (!failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic transient save failure" },
      });
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your changes are retained",
  );
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByText("Grade thresholds saved.")).toBeVisible();
  await page.reload();
  await page.getByLabel("Email address").fill(process.env.E2E_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Sign in to workspace/ }).click();
  await expect(page.getByLabel("Grade label 1", { exact: true })).toHaveValue(
    "Distinction",
  );
});
test("Spectrum course cards, responsive picker layout and reduced effects", async ({
  page,
}) => {
  test.setTimeout(60000);
  await login(page);
  await navigate(page, "Courses");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.locator(".course-card").first()).toBeVisible();
  await shot(page, "course-cards-light");
  for (const width of [320, 375, 390, 768, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(width);
  }
  await page.setViewportSize({
    width: test.info().project.name === "mobile" ? 320 : 1366,
    height: 900,
  });
  await page.getByRole("button", { name: "List", exact: true }).click();
  await navigate(page, "Grades");
  await page.getByLabel("Color theme").selectOption("dark");
  await page
    .getByRole("button", { name: "Add assessment", exact: true })
    .click();
  await page.getByLabel("Marks", { exact: true }).fill("68");
  await page.getByLabel("Maximum marks", { exact: true }).fill("80");
  await expect(page.locator(".assessment-preview strong")).toHaveText("85.0%");
  await page.getByRole("combobox", { name: "Student", exact: true }).click();
  await expect(
    page.locator(".entity-results").getByRole("option").first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Student", exact: true })
    .press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
    ],
  });
  await expect(page.locator(".sidebar")).toHaveCSS("backdrop-filter", "none");
  await shot(page, "grade-form-dark");
});
