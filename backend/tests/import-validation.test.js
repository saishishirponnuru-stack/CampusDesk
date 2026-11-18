import { it, expect } from "vitest";
import { parseImport } from "../src/services/imports.js";
import {
  importConfirmation,
  attendanceBatch,
} from "../src/validators/operations.js";
const header =
  "studentId,rollNumber,firstName,lastName,email,department,academicYear,semester,batch,section,status";
const row =
  "I1,R1,Ada,Example,ada@example.test,Computing,2026-2027,1,2026,A,active";
it("rejects more than 100 records and invalid encoding/control bytes", () => {
  for (const csv of [
    header + "\n" + Array(101).fill(row).join("\n"),
    header + "\n" + row + "\u0000",
    header + "\n" + row + "\ufffd",
  ])
    expect(() => parseImport({ csv, ignoredColumns: [] })).toThrow();
});
it("requires required values rather than inventing an enrollment status", () => {
  const preview = parseImport({
    csv: header + "\n" + row.replace(/active$/, ""),
    ignoredColumns: [],
  });
  expect(preview.rows[0].errors.some((error) => error.field === "status")).toBe(
    true,
  );
});
it("requires an explicit ignored-column decision", () => {
  const csv = header + ",Notes\n" + row + ",ignored";
  expect(
    parseImport({ csv, ignoredColumns: [] }).errors.length,
  ).toBeGreaterThan(0);
  expect(parseImport({ csv, ignoredColumns: ["Notes"] }).errors).toEqual([]);
});
it("rejects unknown import options and case-insensitive duplicate student keys", () => {
  expect(
    importConfirmation.safeParse({ csv: "x", confirm: true, overwrite: true })
      .success,
  ).toBe(false);
  const student = "abcdefabcdefabcdefabcdef";
  expect(
    attendanceBatch.safeParse({
      course: "a".repeat(24),
      date: "2026-11-16",
      records: [
        { student, status: "present", expectedRevision: null },
        {
          student: student.toUpperCase(),
          status: "absent",
          expectedRevision: null,
        },
      ],
    }).success,
  ).toBe(false);
});
