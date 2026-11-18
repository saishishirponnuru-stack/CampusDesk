import { test, expect } from "@playwright/test";
import { fixtureAPI, signIn } from "./fixtures/nova";
test("core semantic colors keep AA text contrast in both themes", async ({
  page,
}) => {
  await page.goto("/");
  for (const mode of ["light", "dark"]) {
    await page.getByLabel("Color theme").selectOption(mode);
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (name) => {
        let hex = style.getPropertyValue(name).trim().slice(1);
        if (hex.length === 3)
          hex = [...hex].map((value) => value + value).join("");
        const rgb = [0, 2, 4]
          .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((value) =>
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      return [
        ["--text", "--surface"],
        ["--muted", "--surface"],
        ["--accent", "--surface"],
        ["--on-accent", "--action"],
        ["--success", "--success-bg"],
        ["--error", "--error-bg"],
        ["--warning", "--warning-bg"],
      ].map(([text, surface]) => {
        const values = [luminance(text), luminance(surface)].sort(
          (a, b) => b - a,
        );
        return {
          text,
          surface,
          ratio: (values[0] + 0.05) / (values[1] + 0.05),
        };
      });
    });
    for (const pair of ratios)
      expect(
        pair.ratio,
        `${mode}: ${pair.text} on ${pair.surface}`,
      ).toBeGreaterThanOrEqual(4.5);
  }
});
test("motion and transparency preferences retain a solid, usable workspace", async ({
  page,
  context,
}) => {
  await fixtureAPI(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
    ],
  });
  await page.goto("/");
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Campus overview" }),
  ).toBeVisible();
  await expect(page.locator(".topbar")).toHaveCSS("backdrop-filter", "none");
  await expect(page.locator(".page-enter")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".sidebar")).toHaveCSS("transition-duration", "0s");
  await page.getByRole("button", { name: "Search workspace" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCSS("backdrop-filter", "none");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
