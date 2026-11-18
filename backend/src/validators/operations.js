import { z } from "zod";
import { id } from "./index.js";
const recordId = id.transform((value) => value.toLowerCase());
export const attendanceBatch = z
  .object({
    course: recordId,
    date: z.iso.date(),
    records: z
      .array(
        z
          .object({
            student: recordId,
            status: z.enum(["present", "absent", "late"]),
            expectedRevision: z.number().int().min(0).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.records.map((row) => row.student)).size ===
      value.records.length,
    { message: "A student may appear only once in a batch", path: ["records"] },
  );
export const registerQuery = z
  .object({
    course: recordId,
    date: z.iso.date(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export const studentFields = [
  "studentId",
  "rollNumber",
  "firstName",
  "lastName",
  "email",
  "phone",
  "department",
  "academicYear",
  "semester",
  "batch",
  "section",
  "status",
];
export const importInput = z
  .object({
    csv: z.string().min(1),
    mapping: z
      .object(
        Object.fromEntries(
          studentFields.map((key) => [key, z.string().max(120).optional()]),
        ),
      )
      .strict()
      .optional(),
    ignoredColumns: z.array(z.string().max(120)).max(20).default([]),
  })
  .strict();
export const importConfirmation = importInput.extend({
  confirm: z.literal(true),
  previewDigest: z.string().regex(/^[a-f\d]{64}$/),
  requestId: z.uuid(),
});
