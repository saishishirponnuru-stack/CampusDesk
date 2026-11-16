import { z } from "zod";
const text = z.string().trim().min(1).max(120);
const number = (min, max) => z.coerce.number().min(min).max(max);
export const id = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid resource ID")
  .transform((value) => value.toLowerCase());
const academic = {
  department: text,
  semester: number(1, 12).int(),
  academicYear: text,
};
export const schemas = {
  students: z
    .object({
      studentId: text,
      rollNumber: text,
      firstName: text,
      lastName: text,
      email: z.email().max(254).toLowerCase(),
      phone: z.string().trim().max(30).optional().default(""),
      ...academic,
      batch: text,
      section: text,
      status: z.enum(["active", "inactive", "graduated"]).default("active"),
    })
    .strict(),
  courses: z
    .object({
      code: text.transform((v) => v.toUpperCase()),
      name: text,
      ...academic,
      credits: number(1, 10),
      facultyName: text,
    })
    .strict(),
  enrollments: z
    .object({
      student: id,
      course: id,
      term: text,
      status: z.enum(["active", "completed", "withdrawn"]).default("active"),
    })
    .strict(),
  attendance: z
    .object({
      student: id,
      course: id,
      date: z.iso.date(),
      status: z.enum(["present", "absent", "late"]),
    })
    .strict(),
  grades: z
    .object({
      student: id,
      course: id,
      term: text,
      assessment: text,
      marks: number(0, 100000),
      maxMarks: number(1, 100000),
    })
    .strict()
    .refine((v) => v.marks <= v.maxMarks, {
      message: "Marks cannot exceed maximum marks",
      path: ["marks"],
    }),
};
export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1).max(128),
});
export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});
export const thresholdSchema = z
  .object({
    thresholds: z
      .array(z.object({ label: text, minimum: number(0, 100) }))
      .min(2)
      .max(10),
  })
  .refine(
    (v) =>
      v.thresholds.some((t) => t.minimum === 0) &&
      new Set(v.thresholds.map((t) => t.minimum)).size ===
        v.thresholds.length &&
      new Set(v.thresholds.map((t) => t.label)).size === v.thresholds.length,
    {
      message:
        "Thresholds must have unique labels and minimums, including zero",
    },
  );
