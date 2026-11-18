import { z } from "zod";
import { id } from "./index.js";
const text = z.string().trim().min(1).max(120);
export const reportQuery = z
  .object({
    department: text.optional(),
    academicYear: text.optional(),
    semester: z
      .string()
      .regex(/^(?:[1-9]|1[0-2])$/)
      .transform(Number)
      .optional(),
    course: id.transform((value) => value.toLowerCase()).optional(),
    term: text.optional(),
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      message: "Start date must not follow end date",
      path: ["dateTo"],
    },
  );
