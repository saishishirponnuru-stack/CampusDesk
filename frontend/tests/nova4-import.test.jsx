import React from "react";
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StudentImport from "../src/features/StudentImport";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount(handler) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options) => {
      const r = handler(url, options);
      return {
        ok: !r.error,
        status: r.error ? 503 : 200,
        json: async () => (r.error ? { message: r.error } : r),
      };
    }),
  );
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter>
        <StudentImport />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function file(name = "students.csv", body = "studentId\nFictional") {
  const f = new File([body], name, { type: "text/csv" });
  f.text = async () => body;
  return f;
}
it("keeps the CSV on preview failure and retries with server-suggested mapping", async () => {
  let calls = 0;
  mount((url, options) => {
    if (url.includes("capabilities")) return { atomicBatches: true };
    calls++;
    const payload = JSON.parse(options.body);
    expect(payload.mapping).toBeUndefined();
    return calls === 1
      ? { error: "Temporary preview failure" }
      : {
          mapping: { studentId: "studentId" },
          ignoredColumns: [],
          headers: ["studentId"],
          errors: [],
          summary: { total: 1, valid: 1, invalid: 0, duplicates: 0 },
          rows: [],
          digest: "synthetic-digest",
        };
  });
  const input = await screen.findByLabelText("Choose CSV file");
  fireEvent.change(input, { target: { files: [file()] } });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Temporary preview failure",
  );
  expect(
    screen.getByRole("heading", { name: "students.csv" }),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Retry validation" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Review import" })).toBeEnabled(),
  );
  expect(calls).toBe(2);
});
it("rejects empty and oversized files before any preview API call", async () => {
  const handler = vi.fn(() => ({ atomicBatches: true }));
  mount(handler);
  const input = await screen.findByLabelText("Choose CSV file");
  fireEvent.change(input, { target: { files: [file("empty.csv", "")] } });
  expect(await screen.findByRole("alert")).toHaveTextContent("empty");
  fireEvent.change(input, {
    target: { files: [file("large.csv", "x".repeat(65537))] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("64 KiB");
  expect(handler).toHaveBeenCalledTimes(1);
});
