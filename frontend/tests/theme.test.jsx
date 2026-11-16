import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, ThemeSelector } from "../src/components/Theme";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
function setup(stored) {
  if (stored) localStorage.setItem("campusdesk-theme", stored);
  const media = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => media);
  render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  );
  return media;
}
it("defaults to system, follows OS changes, and removes its listener", () => {
  const media = setup();
  expect(screen.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "system",
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  media.matches = true;
  media.addEventListener.mock.calls[0][1]();
  expect(document.documentElement.dataset.theme).toBe("dark");
  cleanup();
  expect(media.removeEventListener).toHaveBeenCalledWith(
    "change",
    expect.any(Function),
  );
});
it("persists an explicit choice and ignores OS changes until system is selected", async () => {
  const media = setup();
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole("combobox"), "light");
  expect(localStorage.getItem("campusdesk-theme")).toBe("light");
  media.matches = true;
  media.addEventListener.mock.calls.at(-1)[1]();
  expect(document.documentElement.dataset.theme).toBe("light");
  await user.selectOptions(screen.getByRole("combobox"), "system");
  expect(document.documentElement.dataset.theme).toBe("dark");
});
it("restores saved dark mode", () => {
  setup("dark");
  expect(screen.getByRole("combobox")).toHaveValue("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
});
it("recovers from invalid preferences", () => {
  setup("invalid");
  expect(screen.getByRole("combobox")).toHaveValue("system");
});
