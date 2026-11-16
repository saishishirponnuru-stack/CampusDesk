import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../src/features/Login";
import { Modal } from "../src/components/Feedback";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const wrapper = ({ children }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);
afterEach(() => vi.unstubAllGlobals());
describe("Administrator login", () => {
  it("provides labeled credentials and accessible error feedback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid email or password" }),
      }),
    );
    const user = userEvent.setup();
    render(<Login onLogin={vi.fn()} />, { wrapper });
    await user.type(
      screen.getByLabelText("Email address"),
      "admin@example.test",
    );
    await user.type(screen.getByLabelText("Password"), "incorrect");
    await user.click(
      screen.getByRole("button", { name: /Sign in to workspace/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
  });
  it("authenticates through the real API contract", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "test-token" }),
    });
    vi.stubGlobal("fetch", fetcher);
    const login = vi.fn(),
      user = userEvent.setup();
    render(<Login onLogin={login} />, { wrapper });
    await user.type(
      screen.getByLabelText("Email address"),
      "admin@example.test",
    );
    await user.type(screen.getByLabelText("Password"), "correct password");
    await user.click(
      screen.getByRole("button", { name: /Sign in to workspace/ }),
    );
    await waitFor(() => expect(login).toHaveBeenCalledWith(true));
    expect(fetcher.mock.calls[0][0]).toBe("/api/auth/login");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      email: "admin@example.test",
      password: "correct password",
    });
  });
  it("uses native modal dialogs for keyboard focus containment", () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.removeAttribute("open");
    });
    render(
      <Modal title="Confirm deletion" onClose={vi.fn()}>
        <button>Cancel</button>
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(screen.getByText("Confirm deletion")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close dialog" }),
    ).toBeInTheDocument();
  });
});

describe("Academic forms", () => {
  function dialogSupport() {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
  it("retains zero marks when editing an assessment", async () => {
    dialogSupport();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      }),
    );
    const { RecordForm } = await import("../src/features/Records");
    render(
      <RecordForm
        kind="grades"
        record={{
          _id: "a".repeat(24),
          student: { _id: "b".repeat(24), studentId: "S1" },
          course: { _id: "c".repeat(24), code: "CS1" },
          marks: 0,
          maxMarks: 100,
          term: "2026",
          assessment: "Quiz",
        }}
        onClose={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByLabelText("Marks", { exact: true })).toHaveValue(0);
    expect(screen.getByLabelText("Maximum marks", { exact: true })).toHaveValue(
      100,
    );
  });
  it("rejects marks above maximum before sending a write", async () => {
    dialogSupport();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", fetcher);
    const { RecordForm } = await import("../src/features/Records"),
      user = userEvent.setup();
    render(
      <RecordForm
        kind="grades"
        record={{
          _id: "a".repeat(24),
          student: { _id: "b".repeat(24), studentId: "S1" },
          course: { _id: "c".repeat(24), code: "CS1" },
          marks: 100,
          maxMarks: 50,
          term: "2026",
          assessment: "Quiz",
        }}
        onClose={vi.fn()}
      />,
      { wrapper },
    );
    await user.click(screen.getByRole("button", { name: "Save record" }));
    expect(
      await screen.findByText("Marks cannot exceed maximum"),
    ).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([, o]) => !o.method)).toBe(true);
  });
  it("submits student edits through the API and reports success", async () => {
    dialogSupport();
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetcher);
    const { RecordForm } = await import("../src/features/Records"),
      user = userEvent.setup(),
      close = vi.fn();
    render(
      <RecordForm
        kind="students"
        record={{
          _id: "a".repeat(24),
          studentId: "S1",
          rollNumber: "R1",
          firstName: "Taylor",
          lastName: "Example",
          email: "taylor@example.test",
          department: "Computing",
          academicYear: "2026-2027",
          semester: 1,
          batch: "2026",
          section: "A",
          status: "active",
          phone: "",
        }}
        onClose={close}
      />,
      { wrapper },
    );
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Updated");
    await user.click(screen.getByRole("button", { name: "Save record" }));
    await waitFor(() =>
      expect(close).toHaveBeenCalledWith("Record saved successfully."),
    );
    const [path, options] = fetcher.mock.calls[0];
    expect(path).toBe("/api/students/" + "a".repeat(24));
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body).firstName).toBe("Updated");
  });
});

it("keeps unsaved academic edits unless discard is confirmed", async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const { RecordForm } = await import("../src/features/Records");
  const close = vi.fn(),
    user = userEvent.setup();
  render(<RecordForm kind="students" onClose={close} />, { wrapper });
  await user.type(screen.getByLabelText("First name"), "Taylor");
  await user.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(confirm).toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await user.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(close).toHaveBeenCalledTimes(1);
  confirm.mockRestore();
});
