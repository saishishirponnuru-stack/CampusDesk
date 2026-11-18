import React from "react";
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileDropzone } from "../src/components/FileDropzone";
const csv = new File(["studentId\nS1"], "fictional.csv", { type: "text/csv" });
it("offers a keyboard file picker and allows choosing the same file again", async () => {
  const onSelect = vi.fn();
  render(<FileDropzone onSelect={onSelect} />);
  const input = screen.getByLabelText("Choose CSV file");
  await userEvent.upload(input, csv);
  await userEvent.upload(input, csv);
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelect.mock.calls[0][0][0]).toBe(csv);
  await userEvent.tab();
  expect(screen.getByRole("button", { name: "Browse files" })).toHaveFocus();
});
it("holds drag feedback across children and recovers on leave and drop", () => {
  const onSelect = vi.fn();
  const { container } = render(<FileDropzone onSelect={onSelect} />);
  const zone = container.querySelector(".file-dropzone"),
    child = screen.getByRole("button");
  const dataTransfer = { types: ["Files"], files: [csv] };
  fireEvent.dragEnter(zone, { dataTransfer });
  fireEvent.dragEnter(child, { dataTransfer });
  fireEvent.dragLeave(child, { dataTransfer });
  expect(zone).toHaveClass("is-dragging");
  fireEvent.dragLeave(zone, { dataTransfer });
  expect(zone).not.toHaveClass("is-dragging");
  fireEvent.dragEnter(zone, { dataTransfer });
  fireEvent.drop(zone, { dataTransfer });
  expect(onSelect).toHaveBeenCalledWith([csv]);
  expect(zone).not.toHaveClass("is-dragging");
});
it("does not intercept ordinary text drags or select files while busy", () => {
  const onSelect = vi.fn();
  const { container } = render(
    <FileDropzone
      onSelect={onSelect}
      busy
      status="Validating records with the API…"
    />,
  );
  const zone = container.querySelector(".file-dropzone");
  fireEvent.dragEnter(zone, { dataTransfer: { types: ["text/plain"] } });
  expect(zone).not.toHaveClass("is-dragging");
  fireEvent.drop(zone, { dataTransfer: { types: ["Files"], files: [csv] } });
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByRole("button")).toBeDisabled();
  expect(zone).toHaveAttribute("aria-busy", "true");
});
it("shows real selected metadata and explicit replace and remove controls", async () => {
  const onRemove = vi.fn();
  render(
    <FileDropzone
      file={{ name: csv.name, size: csv.size }}
      onRemove={onRemove}
    />,
  );
  expect(screen.getByRole("heading")).toHaveTextContent("fictional.csv");
  expect(screen.getByRole("button", { name: "Replace file" })).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "Remove file" }));
  expect(onRemove).toHaveBeenCalledOnce();
});
