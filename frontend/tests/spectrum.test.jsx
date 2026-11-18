import React, { useState } from "react";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryRouter,
  useNavigate,
} from "react-router-dom";
import { EntityCombobox } from "../src/components/EntityCombobox";
import {
  GradeThresholdEditor,
  thresholdErrors,
} from "../src/components/GradeThresholdEditor";
import { UnsavedWorkProvider } from "../src/components/UnsavedWork";
import { useUnsavedChanges } from "../src/hooks/useUnsavedChanges";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const student = {
  _id: "a".repeat(24),
  firstName: "Fictional",
  lastName: "Example",
  studentId: "S1",
  rollNumber: "R1",
  department: "Computing",
  semester: 1,
  section: "A",
};
const thresholds = [
  { label: "A", minimum: 90 },
  { label: "B", minimum: 80 },
  { label: "F", minimum: 0 },
];
const provider = ({ children }) => (
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
    {children}
  </QueryClientProvider>
);
function server(handler) {
  const f = vi.fn(async (url, options) => {
    const result = await handler(url, options);
    return {
      ok: !result.error,
      status: result.error ? 503 : 200,
      json: async () => (result.error ? { message: result.error } : result),
    };
  });
  vi.stubGlobal("fetch", f);
  return f;
}
function Picker() {
  const [value, setValue] = useState("");
  return (
    <EntityCombobox
      kind="students"
      label="Student"
      value={value}
      onChange={setValue}
    />
  );
}
it("searches with the keyboard and preserves selected metadata across a new query", async () => {
  const fetcher = server((url) =>
    new URL(url, "http://test").searchParams.get("search") === "Missing"
      ? { items: [], page: 1, pages: 0, total: 0 }
      : { items: [student], page: 1, pages: 1, total: 1 },
  );
  render(<Picker />, { wrapper: provider });
  const input = screen.getByRole("combobox", { name: "Student" });
  await userEvent.click(input);
  await screen.findByRole("option");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(screen.getByText("Fictional Example")).toBeInTheDocument();
  expect(input).toHaveAttribute("aria-expanded", "false");
  await userEvent.type(input, "Missing");
  await screen.findByText(/No matching students/);
  expect(screen.getByText("Fictional Example")).toBeInTheDocument();
  expect(
    fetcher.mock.calls.every(
      ([url, opts]) => url.includes("limit=20") && opts.signal,
    ),
  ).toBe(true);
  await userEvent.keyboard("{Escape}");
  expect(input).toHaveAttribute("aria-expanded", "false");
});
it("loads another server page instead of hiding records past the first result window", async () => {
  server((url) => {
    const p = Number(new URL(url, "http://test").searchParams.get("page"));
    return {
      items: [
        {
          ...student,
          _id: String(p).repeat(24),
          studentId: "PAGE" + p,
          firstName: "Page " + p,
        },
      ],
      page: p,
      pages: 2,
      total: 2,
    };
  });
  render(<Picker />, { wrapper: provider });
  await userEvent.click(screen.getByRole("combobox"));
  await screen.findByRole("option", { name: /Page 1/ });
  await userEvent.click(
    screen.getByRole("button", { name: "Load more students" }),
  );
  expect(
    await screen.findByRole("option", { name: /Page 2/ }),
  ).toBeInTheDocument();
});
it("offers a real retry for a failed picker request", async () => {
  let failed = true;
  server(() =>
    failed
      ? { error: "Down" }
      : { items: [student], page: 1, pages: 1, total: 1 },
  );
  render(<Picker />, { wrapper: provider });
  await userEvent.click(screen.getByRole("combobox"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load students",
  );
  failed = false;
  await userEvent.click(screen.getByRole("button", { name: "Retry results" }));
  expect(await screen.findByRole("option")).toBeInTheDocument();
});
it("does not let an obsolete search response replace the current search", async () => {
  let release;
  server((url) => {
    const term = new URL(url, "http://test").searchParams.get("search");
    if (term === "Old")
      return new Promise(
        (r) =>
          (release = () =>
            r({
              items: [{ ...student, firstName: "Old" }],
              page: 1,
              pages: 1,
              total: 1,
            })),
      );
    return {
      items: term === "New" ? [{ ...student, firstName: "New" }] : [],
      page: 1,
      pages: 1,
      total: 1,
    };
  });
  render(<Picker />, { wrapper: provider });
  const input = screen.getByRole("combobox");
  await userEvent.type(input, "Old");
  await waitFor(() => expect(release).toBeTypeOf("function"));
  await userEvent.clear(input);
  await userEvent.type(input, "New");
  await screen.findByRole("option", { name: /New/ });
  release();
  await waitFor(() =>
    expect(
      screen.queryByRole("option", { name: /Old/ }),
    ).not.toBeInTheDocument(),
  );
});
it.each([
  [
    [
      { label: "A", minimum: 80 },
      { label: "A", minimum: 0 },
    ],
    "labels must be unique",
  ],
  [
    [
      { label: "A", minimum: 0 },
      { label: "F", minimum: 0 },
    ],
    "percentages must be unique",
  ],
  [
    [
      { label: "A", minimum: 80 },
      { label: "F", minimum: 10 },
    ],
    "zero boundary",
  ],
  [
    [
      { label: "A", minimum: 101 },
      { label: "F", minimum: 0 },
    ],
    "between 0 and 100",
  ],
])("validates grading constraints before sending a write: %s", (rows, text) => {
  expect(thresholdErrors(rows).join(" ")).toContain(text);
});
it("adds/removes rules and saves a sorted structured array with real success feedback", async () => {
  const fetcher = server((url, options) => ({
    thresholds: JSON.parse(options.body).thresholds,
  }));
  render(<GradeThresholdEditor thresholds={thresholds} />, {
    wrapper: provider,
  });
  await userEvent.click(screen.getByRole("button", { name: "Add grade" }));
  await userEvent.type(screen.getByLabelText("Grade label 4"), "C");
  await userEvent.type(screen.getByLabelText("Minimum percentage 4"), "70");
  await userEvent.click(
    screen.getByRole("button", { name: "Remove boundary 2" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Save thresholds" }),
  );
  await screen.findByText("Grade thresholds saved.");
  expect(JSON.parse(fetcher.mock.calls[0][1].body).thresholds).toEqual([
    { label: "A", minimum: 90 },
    { label: "C", minimum: 70 },
    { label: "F", minimum: 0 },
  ]);
});
it("does not overwrite dirty grading inputs on a background profile refresh", async () => {
  server(() => ({}));
  const result = render(<GradeThresholdEditor thresholds={thresholds} />, {
    wrapper: provider,
  });
  await userEvent.clear(screen.getByLabelText("Grade label 1"));
  await userEvent.type(screen.getByLabelText("Grade label 1"), "Distinction");
  result.rerender(
    <GradeThresholdEditor
      thresholds={[
        { label: "Remote", minimum: 75 },
        { label: "Fail", minimum: 0 },
      ]}
    />,
  );
  expect(screen.getByLabelText("Grade label 1")).toHaveValue("Distinction");
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});
it("preserves grading input after a failed save and allows retry", async () => {
  let failed = true;
  server((url, options) =>
    failed
      ? { error: "Service unavailable" }
      : { thresholds: JSON.parse(options.body).thresholds },
  );
  render(<GradeThresholdEditor thresholds={thresholds} />, {
    wrapper: provider,
  });
  await userEvent.clear(screen.getByLabelText("Minimum percentage 1"));
  await userEvent.type(screen.getByLabelText("Minimum percentage 1"), "95");
  await userEvent.click(
    screen.getByRole("button", { name: "Save thresholds" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your changes are retained",
  );
  expect(screen.getByLabelText("Minimum percentage 1")).toHaveValue(95);
  failed = false;
  await userEvent.click(
    screen.getByRole("button", { name: "Save thresholds" }),
  );
  await screen.findByText("Grade thresholds saved.");
});
it("blocks and resumes real router Back navigation according to discard confirmation", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  function Draft() {
    useUnsavedChanges(true);
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Go back</button>;
  }
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <UnsavedWorkProvider>
            <Draft />
          </UnsavedWorkProvider>
        ),
      },
    ],
    { initialEntries: ["/students", "/grades"] },
  );
  render(<RouterProvider router={router} />);
  await userEvent.click(screen.getByRole("button", { name: "Go back" }));
  expect(confirm).toHaveBeenCalled();
  expect(router.state.location.pathname).toBe("/grades");
  confirm.mockReturnValue(true);
  await userEvent.click(screen.getByRole("button", { name: "Go back" }));
  await waitFor(() => expect(router.state.location.pathname).toBe("/students"));
  router.dispose();
});
it("lets Settings navigate after saving grading rules when password fields are untouched", async () => {
  const { default: Settings } = await import("../src/features/Settings");
  server((url, options) => ({
    thresholds: JSON.parse(options.body).thresholds,
  }));
  function Screen() {
    const navigate = useNavigate();
    return (
      <>
        <button onClick={() => navigate("/students")}>Open students</button>
        <Settings
          me={{
            data: {
              name: "Synthetic",
              email: "synthetic@example.test",
              thresholds,
            },
          }}
          logout={() => {}}
        />
      </>
    );
  }
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const router = createMemoryRouter(
    [
      {
        path: "/settings",
        element: (
          <UnsavedWorkProvider>
            <Screen />
          </UnsavedWorkProvider>
        ),
      },
      { path: "/students", element: <p>Directory ready</p> },
    ],
    { initialEntries: ["/settings"] },
  );
  render(<RouterProvider router={router} />, { wrapper: provider });
  await userEvent.clear(screen.getByLabelText("Minimum percentage 1"));
  await userEvent.type(screen.getByLabelText("Minimum percentage 1"), "95");
  await userEvent.click(
    screen.getByRole("button", { name: "Save thresholds" }),
  );
  await screen.findByText("Grade thresholds saved.");
  await userEvent.click(screen.getByRole("button", { name: "Open students" }));
  await screen.findByText("Directory ready");
  expect(confirm).not.toHaveBeenCalled();
  router.dispose();
});
it("returns focus from the paging control on Escape and reopens on input click", async () => {
  server(() => ({ items: [student], page: 1, pages: 2, total: 21 }));
  render(<Picker />, { wrapper: provider });
  const input = screen.getByRole("combobox");
  await userEvent.click(input);
  await screen.findByRole("option");
  await userEvent.tab();
  expect(
    screen.getByRole("button", { name: "Load more students" }),
  ).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  expect(input).toHaveFocus();
  expect(input).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(input);
  expect(input).toHaveAttribute("aria-expanded", "true");
});
