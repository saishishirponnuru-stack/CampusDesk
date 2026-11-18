import React from "react";
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AttendanceRegister from "../src/features/AttendanceRegister";
import Reports from "../src/features/Reports";
vi.mock("../src/components/LazyChart", () => ({
  Chart: ({ title }) => <h2>{title}</h2>,
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const course = {
  _id: "b".repeat(24),
  name: "Synthetic course",
  code: "TEST",
  academicYear: "2026-2027",
};
function renderApp(child) {
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
      <MemoryRouter>{child}</MemoryRouter>
    </QueryClientProvider>,
  );
}
function server(handler) {
  const fetcher = vi.fn(async (path, options) => {
    const result = await handler(path, options);
    return {
      ok: !result.error,
      status: result.error ? 503 : 200,
      json: async () => (result.error ? { message: result.error } : result),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
it("explains unavailable transactions without showing a false save action", async () => {
  server((path) =>
    path.includes("capabilities")
      ? { atomicBatches: false }
      : { items: [course] },
  );
  renderApp(<AttendanceRegister />);
  expect(await screen.findByRole("alert")).toHaveTextContent("replica set");
  expect(
    screen.queryByRole("button", { name: "Review changes" }),
  ).not.toBeInTheDocument();
});
it("handles an empty session date without leaving the user in an infinite loading state", async () => {
  server((path) =>
    path.includes("capabilities")
      ? { atomicBatches: true }
      : path.includes("/register?")
        ? { course, total: 0, pages: 0, items: [] }
        : { items: [course] },
  );
  renderApp(<AttendanceRegister />);
  await userEvent.click(
    await screen.findByLabelText("Course", { exact: true }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: /Synthetic course/ }),
  );
  await screen.findByText("0 eligible");
  await userEvent.clear(screen.getByLabelText("Session date"));
  expect(
    screen.getByText(/Choose a course and session date/),
  ).toBeInTheDocument();
  expect(screen.queryByText("Loading records…")).not.toBeInTheDocument();
});
it("keeps unsaved attendance when changing the context is cancelled", async () => {
  server((path) =>
    path.includes("capabilities")
      ? { atomicBatches: true }
      : path.includes("/register?")
        ? {
            course,
            total: 1,
            pages: 1,
            items: [
              {
                student: {
                  _id: "a".repeat(24),
                  firstName: "Test",
                  lastName: "Student",
                  studentId: "TEST1",
                },
                attendance: null,
              },
            ],
          }
        : { items: [course] },
  );
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  renderApp(<AttendanceRegister />);
  await userEvent.click(
    await screen.findByLabelText("Course", { exact: true }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: /Synthetic course/ }),
  );
  await userEvent.click(
    await screen.findByRole("button", {
      name: "Mark all present",
      exact: true,
    }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Clear Course" }));
  expect(confirm).toHaveBeenCalled();
  expect(screen.getByLabelText("Course", { exact: true })).toHaveAttribute(
    "placeholder",
    course.name,
  );
  expect(screen.getByText("1 unsaved changes")).toBeInTheDocument();
});
it("recovers from a register fetch failure with an explicit retry", async () => {
  let failed = true;
  server((path) =>
    path.includes("capabilities")
      ? { atomicBatches: true }
      : path.includes("/register?")
        ? failed
          ? { error: "Temporary register failure" }
          : { course, total: 0, pages: 0, items: [] }
        : { items: [course] },
  );
  renderApp(<AttendanceRegister />);
  await userEvent.click(
    await screen.findByLabelText("Course", { exact: true }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: /Synthetic course/ }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Temporary register failure",
  );
  failed = false;
  await userEvent.click(screen.getByRole("button", { name: "Retry register" }));
  expect(await screen.findByText("0 eligible")).toBeInTheDocument();
});
it("applies filters only on confirmation and disables export when the filtered query fails", async () => {
  const fetcher = server((path) =>
    path.includes("/courses?")
      ? { items: [] }
      : path.includes("department=Computing")
        ? { error: "Filtered report unavailable" }
        : {
            departments: [],
            years: [],
            attendance: [],
            performance: [],
            courseEnrollments: [],
          },
  );
  renderApp(<Reports />);
  await screen.findByRole("heading", { name: "Behind the numbers" });
  await userEvent.type(
    screen.getByLabelText("Department", { exact: true }),
    "Computing",
  );
  expect(
    fetcher.mock.calls.some(([url]) => url.includes("department=Computing")),
  ).toBe(false);
  await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Filtered report unavailable",
  );
  expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled(),
  );
  expect(screen.getByLabelText("Department", { exact: true })).toHaveValue("");
});
