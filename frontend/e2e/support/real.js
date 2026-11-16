import { expect } from "@playwright/test";
export async function login(page) {
  await page.goto("/");
  await page.getByLabel("Email address").fill(process.env.E2E_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Sign in to workspace/ }).click();
  const result = await response;
  expect(result.ok()).toBe(true);
  const token = (await result.json()).token;
  await expect(
    page.getByRole("heading", { name: "Campus overview" }),
  ).toBeVisible();
  return { Authorization: "Bearer " + token };
}
export async function navigate(page, name) {
  if (page.viewportSize().width <= 640)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true })
    .click();
}
export async function post(request, path, headers, data) {
  const result = await request.post("http://127.0.0.1:5000/api" + path, {
    headers,
    data,
  });
  expect(result.ok()).toBe(true);
  return result.json();
}
export async function capture(page, test, name, theme) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(page.viewportSize().width);
  await page.screenshot({
    path: `test-results/phase2-${name}-${theme}-${test.info().project.name}.png`,
    fullPage: !name.endsWith("-review") && !name.includes("conflict"),
    animations: "disabled",
    scale: "css",
  });
}
