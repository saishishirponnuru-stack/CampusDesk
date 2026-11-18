import { test, expect } from "@playwright/test";
test.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Requires explicitly supplied isolated development credentials and running API",
);
test("student lifecycle persists through reload and navigation", async ({
  page,
}) => {
  const suffix = Date.now().toString(),
    studentId = "E2E-" + suffix;
  const login = async () => {
    await page.getByLabel("Email address").fill(process.env.E2E_ADMIN_EMAIL);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: /Sign in to workspace/ }).click();
    await expect(
      page.getByRole("navigation", {
        name: "Main navigation",
        includeHidden: true,
      }),
    ).toBeAttached();
  };
  await page.goto("/");
  await login();
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Students", exact: true })
    .click();
  await page.getByRole("button", { name: "Add student", exact: true }).click();
  for (const [name, value] of [
    ["Student ID", studentId],
    ["Roll number", studentId],
    ["First name", "E2E"],
    ["Last name", "Example"],
    ["Email", suffix + "@example.test"],
    ["Department", "Computing"],
    ["Academic year", "2026-2027"],
    ["Semester", "1"],
    ["Batch", "2026"],
    ["Section", "A"],
  ])
    await page.getByLabel(name, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("status")).toContainText("Record saved");
  await page.getByRole("textbox", { name: "Search records" }).fill(studentId);
  const row = page
    .locator("tr:visible, article.mobile-record:visible")
    .filter({ hasText: studentId });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "E2E Example" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E Example" }),
  ).toBeVisible();
  await page.reload();
  await login();
  await page.getByRole("link", { name: "All students", exact: true }).click();
  await page.getByRole("textbox", { name: "Search records" }).fill(studentId);
  const persisted = page
    .locator("tr:visible, article.mobile-record:visible")
    .filter({ hasText: studentId });
  await expect(persisted).toBeVisible();
  await persisted.getByRole("button", { name: "Edit student" }).click();
  await page.getByLabel("First name", { exact: true }).fill("Updated");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(persisted).toContainText("Updated");
  await persisted.getByRole("button", { name: "Delete student" }).click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(persisted).toHaveCount(0);
});
