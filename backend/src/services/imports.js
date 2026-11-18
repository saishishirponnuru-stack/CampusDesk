import { parse } from "csv-parse/sync";
import { createHash } from "node:crypto";
import { Student, OperationReceipt } from "../models/index.js";
import { schemas } from "../validators/index.js";
import { studentFields } from "../validators/operations.js";
import { fail } from "../middleware/auth.js";
import { atomic, invalid } from "./transactions.js";
const unique = ["studentId", "rollNumber", "email"];
const normalizeHeader = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
export function parseImport(input) {
  if (Buffer.byteLength(input.csv, "utf8") > 65536)
    throw fail(413, "CSV files must be at most 64 KiB");
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]/.test(input.csv))
    throw fail(422, "Use a valid UTF-8 CSV without control characters");
  let parsed;
  try {
    parsed = parse(input.csv, {
      bom: true,
      skip_empty_lines: true,
      max_record_size: 8192,
    });
  } catch {
    throw fail(422, "Malformed CSV. Check quotes, separators and row lengths.");
  }
  if (parsed.length < 2)
    throw fail(422, "CSV must contain a header and at least one data row");
  if (parsed.length > 101)
    throw fail(422, "Import at most 100 students at a time");
  const headers = parsed.shift().map((value) => value.trim());
  if (
    headers.length > 20 ||
    headers.some((value) => !value || value.length > 120) ||
    new Set(headers.map(normalizeHeader)).size !== headers.length
  )
    throw fail(422, "Use at most 20 nonempty, unique column headings");
  const suggestedMapping = Object.fromEntries(
    studentFields.flatMap((field) => {
      const match = headers.find(
        (header) => normalizeHeader(header) === normalizeHeader(field),
      );
      return match ? [[field, match]] : [];
    }),
  );
  const mapping = input.mapping || suggestedMapping,
    ignored = input.ignoredColumns;
  const used = Object.values(mapping).filter(Boolean),
    errors = [];
  for (const field of studentFields.filter((field) => field !== "phone"))
    if (!mapping[field])
      errors.push({ field, message: "Map this required field" });
  if (new Set(used).size !== used.length)
    errors.push({
      field: "mapping",
      message: "Each source column can map to only one field",
    });
  for (const header of [...used, ...ignored])
    if (!headers.includes(header))
      errors.push({
        field: "mapping",
        message: "A mapped or ignored column was not found",
      });
  for (const header of headers)
    if (!used.includes(header) && !ignored.includes(header))
      errors.push({
        field: "mapping",
        message: "Map or explicitly ignore column: " + header,
      });
  if (ignored.some((header) => used.includes(header)))
    errors.push({
      field: "mapping",
      message: "A column cannot be both mapped and ignored",
    });
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        csv: input.csv,
        mapping: Object.fromEntries(Object.entries(mapping).sort()),
        ignored: [...ignored].sort(),
      }),
    )
    .digest("hex");
  const rows = parsed.map((record, index) => {
    const raw = Object.fromEntries(
      studentFields
        .filter((field) => mapping[field])
        .map((field) => [
          field,
          (record[headers.indexOf(mapping[field])] || "").trim(),
        ]),
    );
    const result = schemas.students.safeParse(raw);
    return {
      row: index + 1,
      data: result.success ? result.data : raw,
      errors: result.success
        ? []
        : result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
      duplicate: false,
    };
  });
  for (const field of unique) {
    const groups = new Map();
    for (const row of rows) {
      const raw = String(row.data[field] || "").trim(),
        value = field === "email" ? raw.toLowerCase() : raw;
      if (value) {
        const group = groups.get(value) || [];
        group.push(row);
        groups.set(value, group);
      }
    }
    for (const group of groups.values())
      if (group.length > 1)
        for (const row of group) {
          row.duplicate = true;
          row.errors.push({
            field,
            message: "Duplicate value within this CSV",
          });
        }
  }
  return {
    headers,
    suggestedMapping,
    mapping,
    ignoredColumns: ignored,
    errors,
    rows,
    digest,
  };
}
export async function previewImport(input, session) {
  const preview = parseImport(input);
  if (!preview.errors.length) {
    const existing = await Student.find({
      $or: unique.map((field) => ({
        [field]: {
          $in: preview.rows
            .map((row) => row.data[field])
            .filter((value) => typeof value === "string"),
        },
      })),
    })
      .select(unique.join(" "))
      .session(session || null)
      .lean();
    for (const row of preview.rows)
      for (const field of unique)
        if (existing.some((record) => record[field] === row.data[field])) {
          row.duplicate = true;
          row.errors.push({
            field,
            message:
              "Already exists in the database; existing students are never overwritten",
          });
        }
  }
  const invalid = preview.rows.filter((row) => row.errors.length).length;
  return {
    ...preview,
    summary: {
      total: preview.rows.length,
      valid: preview.errors.length ? 0 : preview.rows.length - invalid,
      invalid: preview.errors.length ? preview.rows.length : invalid,
      duplicates: preview.rows.filter((row) => row.duplicate).length,
    },
  };
}
export async function commitImport(input, actor) {
  const parsed = parseImport(input);
  if (parsed.digest !== input.previewDigest)
    throw fail(
      409,
      "The CSV or mapping changed. Validate a fresh preview before importing.",
    );
  return atomic(async (session) => {
    const receipt = await OperationReceipt.findOne({
      actor,
      requestId: input.requestId,
    })
      .session(session)
      .lean();
    if (receipt) {
      if (receipt.hash !== parsed.digest)
        throw fail(
          409,
          "This request ID was used for different import content",
        );
      return { ...receipt.result, replayed: true };
    }
    const preview = await previewImport(input, session);
    if (preview.errors.length || preview.summary.invalid)
      throw invalid(
        422,
        "The import was not saved. Correct every row and validate again.",
        preview.errors.length
          ? preview.errors
          : preview.rows
              .filter((row) => row.errors.length)
              .map((row) => ({ row: row.row, errors: row.errors })),
      );
    const students = await Student.insertMany(
      preview.rows.map((row) => row.data),
      { session, ordered: true },
    );
    const result = {
      created: students.length,
      studentIds: students.map((student) => String(student._id)),
      replayed: false,
    };
    await OperationReceipt.create(
      [{ actor, requestId: input.requestId, hash: parsed.digest, result }],
      { session },
    );
    return result;
  });
}
