import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { login, navigate, post, capture } from "./support/real";
test.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Requires the owned disposable API/database runner",
);
test.use({ actionTimeout: 10000 });
for (const theme of ["light", "dark"])
  test(`Phase II bulk attendance commits and detects conflicts (${theme})`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    if (test.info().project.name === "mobile")
      await page.setViewportSize({ width: 320, height: 900 });
    const headers = await login(page);
    await page.getByLabel("Color theme").selectOption(theme);
    const tag = Date.now() + test.info().project.name + theme,
      department = "Bulk " + tag;
    const course = await post(request, "/courses", headers, {
      code: "B" + tag.toUpperCase(),
      name: "Register course " + tag,
      department,
      academicYear: "2026-2027",
      semester: 1,
      credits: 3,
      facultyName: "Dr Synthetic",
    });
    const students = [];
    for (let i = 0; i < 3; i++) {
      const student = await post(request, "/students", headers, {
        studentId: "BULK-" + tag + "-" + i,
        rollNumber: "BR-" + tag + "-" + i,
        firstName: "Bulk",
        lastName: String(i),
        email: `bulk${i}${tag}@example.test`,
        department,
        academicYear: "2026-2027",
        semester: 1,
        batch: "2026",
        section: "A",
        status: "active",
      });
      students.push(student);
      await post(request, "/enrollments", headers, {
        student: student._id,
        course: course._id,
        term: "2026-2027",
        status: "active",
      });
    }
    await navigate(page, "Attendance");
    await page.getByRole("link", { name: "Open register" }).click();
    await page.getByLabel("Find a course", { exact: true }).fill(course.code);
    await page.getByLabel("Course", { exact: true }).selectOption(course._id);
    await page.getByLabel("Session date", { exact: true }).fill("2026-11-17");
    await expect(page.getByText("3 eligible", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Mark all present", exact: true })
      .click();
    await expect(
      page.getByText("3 unsaved changes", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear changes", exact: true })
      .click();
    await page.getByRole("checkbox", { name: "Select Bulk 0" }).check();
    await page.getByRole("checkbox", { name: "Select Bulk 1" }).check();
    await page.getByRole("button", { name: "Mark selected late" }).click();
    const group = page.getByRole("group", {
      name: "Attendance for Bulk 0",
      exact: true,
    });
    await group.getByRole("radio", { name: "Present", exact: true }).check();
    await capture(page, test, "register", theme);
    await page.getByRole("button", { name: "Review changes" }).click();
    await capture(page, test, "attendance-review", theme);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/attendance/bulk") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save attendance", exact: true })
      .click();
    const saved = await response;
    expect(saved.ok()).toBe(true);
    const payload = saved.request().postDataJSON();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/2 created, 0 updated/)).toBeVisible();
    let records = await (
      await request.get(
        `http://127.0.0.1:5000/api/attendance?course=${course._id}&date=2026-11-17`,
        { headers },
      )
    ).json();
    expect(records.total).toBe(2);
    expect(
      records.items.some((row) => row.student._id === students[2]._id),
    ).toBe(false);
    const retry = await post(request, "/attendance/bulk", headers, payload);
    expect(retry).toMatchObject({ created: 0, updated: 0, unchanged: 2 });
    await capture(page, test, "attendance-saved", theme);
    await group.getByRole("radio", { name: "Late", exact: true }).check();
    const record = records.items.find(
      (row) => row.student._id === students[0]._id,
    );
    expect(
      (
        await request.put(
          "http://127.0.0.1:5000/api/attendance/" + record._id,
          {
            headers,
            data: {
              student: students[0]._id,
              course: course._id,
              date: "2026-11-17",
              status: "absent",
            },
          },
        )
      ).ok(),
    ).toBe(true);
    await page.getByRole("button", { name: "Review changes" }).click();
    await page
      .getByRole("button", { name: "Save attendance", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "Attendance changed",
    );
    await capture(page, test, "attendance-conflict", theme);
    await page.getByRole("button", { name: "Back to register" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reload register" }).click();
    await expect(
      group.getByRole("radio", { name: "Absent", exact: true }),
    ).toBeChecked();
    const reports = await (
      await request.get("http://127.0.0.1:5000/api/reports", { headers })
    ).json();
    expect(
      reports.attendance.find((row) => row._id === course._id).percentage,
    ).toBe(50);
  });
for (const theme of ["light", "dark"])
  test(`Phase II CSV mapping, validation and atomic import (${theme})`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    if (test.info().project.name === "mobile")
      await page.setViewportSize({ width: 320, height: 900 });
    const headers = await login(page);
    await page.getByLabel("Color theme").selectOption(theme);
    await navigate(page, "Students");
    await page.getByRole("link", { name: "Import CSV", exact: true }).click();
    const template = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV template" }).click();
    expect((await template).suggestedFilename()).toBe(
      "campusdesk-students-template.csv",
    );
    const tag = Date.now() + test.info().project.name + theme;
    const columns =
      "studentId,rollNumber,Given name,lastName,email,phone,department,academicYear,semester,batch,section,status\n";
    const invalid =
      columns +
      `IMPORT-${tag},IR-${tag},CSV,Example,invalid,,Computing,2026-2027,1,2026,A,active\nIMPORT-${tag},IR-${tag},CSV,Example,invalid,,Computing,2026-2027,1,2026,A,active\n`;
    await page.getByLabel("Choose CSV file", { exact: true }).setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(invalid),
    });
    await page
      .getByLabel("Map First name", { exact: true })
      .selectOption("Given name");
    await page.getByRole("button", { name: "Validate mapping" }).click();
    await expect(
      page.getByText(/Duplicate value within this CSV/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review import" }),
    ).toBeDisabled();
    await capture(page, test, "import-errors", theme);
    const source =
      columns +
      [0, 1]
        .map(
          (i) =>
            `IMPORT-${tag}-${i},IR-${tag}-${i},CSV${i},Example,csv${i}${tag}@example.test,,Computing,2026-2027,1,2026,A,active`,
        )
        .join("\n");
    await page.getByLabel("Choose CSV file", { exact: true }).setInputFiles({
      name: "students.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(source),
    });
    await page
      .getByLabel("Map First name", { exact: true })
      .selectOption("Given name");
    await page.getByRole("button", { name: "Validate mapping" }).click();
    await expect(
      page.getByRole("button", { name: "Review import" }),
    ).toBeEnabled();
    const before = await (
      await request.get("http://127.0.0.1:5000/api/students?search=" + tag, {
        headers,
      })
    ).json();
    expect(before.total).toBe(0);
    await capture(page, test, "import-preview", theme);
    await page.getByRole("button", { name: "Review import" }).click();
    await capture(page, test, "import-review", theme);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/students/import") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Import 2 students", exact: true })
      .click();
    const result = await response;
    expect(result.ok()).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Import complete", exact: true }),
    ).toBeVisible();
    await capture(page, test, "import-saved", theme);
    const payload = result.request().postDataJSON();
    const replay = await post(request, "/students/import", headers, payload);
    expect(replay.replayed).toBe(true);
    const after = await (
      await request.get("http://127.0.0.1:5000/api/students?search=" + tag, {
        headers,
      })
    ).json();
    expect(after.total).toBe(2);
    expect(
      (
        await request.post("http://127.0.0.1:5000/api/students/import", {
          headers,
          data: { ...payload, requestId: randomUUID() },
        })
      ).status(),
    ).toBe(422);
  });
