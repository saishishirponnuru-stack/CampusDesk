import { test, expect } from "@playwright/test";
import { login, navigate, capture } from "./support/real";
test.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Requires owned disposable database",
);
for (const theme of ["light", "dark"])
  test(`Nova 4 upload drag, errors, retry and keyboard (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    page.on("dialog", (d) => d.accept());
    await login(page);
    await page.getByLabel("Color theme").selectOption(theme);
    await navigate(page, "Students");
    await page.getByRole("link", { name: "Import CSV", exact: true }).click();
    const zone = page.getByRole("region", { name: "Student CSV dropzone" });
    await expect(zone).toBeVisible();
    await capture(page, test, "nova4-upload-idle", theme);
    for (const width of [320, 375, 390, 768, 1024, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
      await expect(
        page.getByRole("button", { name: "Browse files" }),
      ).toBeVisible();
    }
    await page.setViewportSize({
      width: test.info().project.name === "mobile" ? 320 : 1366,
      height: 900,
    });
    await page.getByRole("button", { name: "Browse files" }).focus();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (
      await chooser
    ).setFiles({
      name: "not-a-csv.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("wrong"),
    });
    await expect(page.getByRole("alert")).toContainText("UTF-8 .csv");
    await page
      .getByLabel("Choose CSV file")
      .setInputFiles({
        name: "large.csv",
        mimeType: "text/csv",
        buffer: Buffer.alloc(65537, 65),
      });
    await expect(page.getByRole("alert")).toContainText("64 KiB");
    await page.getByRole("button", { name: "Remove file" }).click();
    const tag = Date.now() + theme + test.info().project.name;
    const csv =
      "studentId,rollNumber,firstName,lastName,email,phone,department,academicYear,semester,batch,section,status\n" +
      `DROP-${tag},R-${tag},Fictional,Reviewer,drop${tag}@example.test,,Computing,2026-2027,1,2026,A,active`;
    const transfer = await page.evaluateHandle(
      ({ csv }) => {
        const dt = new DataTransfer();
        dt.items.add(new File([csv], "drop.csv", { type: "text/csv" }));
        return dt;
      },
      { csv },
    );
    await zone.dispatchEvent("dragenter", { dataTransfer: transfer });
    await expect(zone).toHaveClass(/is-dragging/);
    await capture(page, test, "nova4-upload-drag", theme);
    await zone.dispatchEvent("dragleave", { dataTransfer: transfer });
    await expect(zone).not.toHaveClass(/is-dragging/);
    // Exercise a genuine preview API failure, then retry the retained selection.
    let failed = false;
    await page.route("**/api/students/import/preview", async (route) => {
      if (!failed) {
        failed = true;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Synthetic temporary preview failure",
          }),
        });
      } else await route.continue();
    });
    await zone.dispatchEvent("drop", { dataTransfer: transfer });
    await transfer.dispose();
    await expect(page.getByRole("alert")).toContainText(
      "Synthetic temporary preview failure",
    );
    await expect(page.getByRole("heading", { name: "drop.csv" })).toBeVisible();
    await page.getByRole("button", { name: "Retry validation" }).click();
    await expect(
      page.getByRole("button", { name: "Review import" }),
    ).toBeEnabled();
    await capture(page, test, "nova4-upload-selected", theme);
    await expect(page.locator('[aria-current="step"]')).toHaveText(
      /Validate records/,
    );
    await page.getByRole("button", { name: "Review import" }).click();
    await expect(page.getByRole("dialog")).toContainText("drop.csv");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Review import" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Review import" }).click();
    await page
      .getByRole("button", { name: "Import 1 students", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Import complete", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start another import" }).click();
    await expect(
      page.getByRole("button", { name: "Browse files" }),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".upload-emblem")).toHaveCSS(
      "transition-duration",
      "0s",
    );
  });
