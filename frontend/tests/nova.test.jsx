import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CourseProfile from "../src/features/CourseProfile";
import Dashboard from "../src/features/Dashboard";
vi.mock("../src/components/LazyChart", () => ({
  Chart: ({ title }) => <h2>{title}</h2>,
}));
afterEach(() => vi.unstubAllGlobals());
function wrap(children, path = "/") {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
it("loads a course and server-paginated roster, then requests the next page", async () => {
  const id = "b".repeat(24),
    fetcher = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes("/enrollments")
          ? {
              total: 21,
              pages: 2,
              items: [
                {
                  _id: "e",
                  term: "2026",
                  status: "active",
                  student: {
                    _id: "a".repeat(24),
                    firstName: "Avery",
                    lastName: "Morgan",
                    studentId: "S1",
                  },
                },
              ],
            }
          : {
              name: "Computing",
              code: "CS201",
              department: "Computing",
              credits: 4,
              semester: 3,
              academicYear: "2026",
              facultyName: "Dr Example",
            },
    }));
  vi.stubGlobal("fetch", fetcher);
  render(
    wrap(
      <Routes>
        <Route path="/courses/:id" element={<CourseProfile />} />
      </Routes>,
      "/courses/" + id,
    ),
  );
  expect(
    await screen.findByRole("heading", { name: "Computing" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("link", { name: "Avery Morgan" }),
  ).toHaveAttribute("href", "/students/" + "a".repeat(24));
  await userEvent.click(
    screen.getByRole("button", { name: "Next roster page" }),
  );
  expect(
    fetcher.mock.calls.some(([url]) =>
      url.includes("course=" + id + "&page=2&limit=20"),
    ),
  ).toBe(true);
});
it("computes the dashboard result from summed marks, not averaged percentages", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        metrics: {
          students: 2,
          activeStudents: 1,
          courses: 2,
          enrollments: 2,
          attendancePercentage: null,
        },
        performance: [
          { marks: 10, maxMarks: 10, assessments: 1 },
          { marks: 0, maxMarks: 90, assessments: 1 },
        ],
        recentStudents: [],
        recentActivity: [],
        departments: [],
        enrollmentTrends: [],
      }),
    })),
  );
  render(wrap(<Dashboard />));
  expect(await screen.findByText("10.0%")).toBeInTheDocument();
  expect(screen.queryByText("50.0%")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Active students/ })).toHaveAttribute(
    "href",
    "/students?status=active",
  );
  expect(screen.getByRole("link", { name: "Add student" })).toHaveAttribute(
    "href",
    "/students?action=new",
  );
});
