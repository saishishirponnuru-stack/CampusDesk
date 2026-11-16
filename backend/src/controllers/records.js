import {
  models,
  Student,
  Attendance,
  Grade,
  Enrollment,
} from "../models/index.js";
import { schemas, id } from "../validators/index.js";
import { fail } from "../middleware/auth.js";
import {
  validateRelations,
  checkUpdate,
  checkDelete,
  queryOptions,
  writeExclusive,
} from "../services/records.js";
import { gradeLabel } from "../services/reports.js";
export function routes(router, kind) {
  const Model = models[kind];
  const populated = (query) =>
    ["enrollments", "attendance", "grades"].includes(kind)
      ? query
          .populate("student", "firstName lastName studentId department")
          .populate("course", "name code academicYear")
      : query;
  router.get("/" + kind, async (req, res) => {
    const { filter, page, limit, sort } = queryOptions(kind, req.query);
    const [items, total] = await Promise.all([
      populated(
        Model.find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit),
      ).lean(),
      Model.countDocuments(filter),
    ]);
    res.json({
      items:
        kind === "grades"
          ? items.map((g) => ({
              ...g,
              percentage: (g.marks / g.maxMarks) * 100,
              letter: gradeLabel(
                (g.marks / g.maxMarks) * 100,
                req.admin.thresholds,
              ),
            }))
          : items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  });
  router.get("/" + kind + "/:id", async (req, res) => {
    id.parse(req.params.id);
    const record = await populated(Model.findById(req.params.id)).lean();
    if (!record) throw fail(404, "Record not found");
    res.json(record);
  });
  router.post("/" + kind, async (req, res) => {
    const data = schemas[kind].parse(req.body);
    const record = await writeExclusive(async () => {
      await validateRelations(kind, data);
      return Model.create(data);
    });
    res.status(201).json(record);
  });
  router.put("/" + kind + "/:id", async (req, res) => {
    id.parse(req.params.id);
    const data = schemas[kind].parse(req.body);
    const record = await writeExclusive(async () => {
      const current = await Model.findById(req.params.id);
      if (!current) throw fail(404, "Record not found");
      await checkUpdate(kind, current, data);
      await validateRelations(kind, data);
      Object.assign(current, data);
      if (kind === "attendance") current.revision = (current.revision ?? 0) + 1;
      return current.save();
    });
    res.json(record);
  });
  router.delete("/" + kind + "/:id", async (req, res) => {
    id.parse(req.params.id);
    await writeExclusive(async () => {
      const current = await Model.findById(req.params.id);
      if (!current) throw fail(404, "Record not found");
      await checkDelete(kind, current);
      await current.deleteOne();
    });
    res.status(204).end();
  });
}
export async function studentHistory(req, res) {
  id.parse(req.params.id);
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw fail(404, "Student not found");
  const [attendance, grades, enrollments] = await Promise.all([
    Attendance.find({ student: student._id })
      .populate("course")
      .sort({ date: -1 })
      .limit(500)
      .lean(),
    Grade.find({ student: student._id }).populate("course").limit(500).lean(),
    Enrollment.find({ student: student._id })
      .populate("course")
      .limit(500)
      .lean(),
  ]);
  const [summary] = await Attendance.aggregate([
    { $match: { student: student._id } },
    {
      $group: {
        _id: null,
        recorded: { $sum: 1 },
        attended: {
          $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] },
        },
      },
    },
  ]);
  res.json({
    student,
    enrollments,
    attendance,
    grades: grades.map((g) => ({
      ...g,
      percentage: (g.marks / g.maxMarks) * 100,
      letter: gradeLabel((g.marks / g.maxMarks) * 100, req.admin.thresholds),
    })),
    attendancePercentage: summary
      ? (summary.attended / summary.recorded) * 100
      : null,
    historyLimit: 500,
  });
}
