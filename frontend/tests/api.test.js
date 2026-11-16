import { afterEach, expect, it, vi } from "vitest";
import { api, download, setToken } from "../src/api";
afterEach(() => {
  setToken("");
  vi.unstubAllGlobals();
});
const unauthorized = () => ({
  ok: false,
  status: 401,
  json: async () => ({ message: "Session expired" }),
});
it("expires a session on an unauthorized CSV download", async () => {
  setToken("old-session");
  const listener = vi.fn();
  window.addEventListener("session-expired", listener);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
  await expect(download("attendance")).rejects.toThrow("Session expired");
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener("session-expired", listener);
});
it("does not expire a newer session when an older request fails", async () => {
  let finish;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const listener = vi.fn();
  window.addEventListener("session-expired", listener);
  setToken("old-session");
  const pending = api("/students");
  setToken("new-session");
  finish(unauthorized());
  await expect(pending).rejects.toThrow();
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener("session-expired", listener);
});
it("provides actionable network failure feedback without exposing details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("private-network-detail")),
  );
  await expect(api("/reports")).rejects.toThrow("Please try again");
});
it("does not expire the session on failed login", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
  const listener = vi.fn();
  window.addEventListener("session-expired", listener);
  await expect(api("/auth/login")).rejects.toThrow();
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener("session-expired", listener);
});
