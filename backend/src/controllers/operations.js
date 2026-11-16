import {
  attendanceBatch,
  registerQuery,
  importInput,
  importConfirmation,
  studentFields,
} from "../validators/operations.js";
import { attendanceRegister, saveAttendance } from "../services/attendance.js";
import { previewImport, commitImport } from "../services/imports.js";
import { capabilities } from "../services/transactions.js";
export function operationRoutes(router) {
  router.get("/operations/capabilities", async (req, res) =>
    res.json(await capabilities()),
  );
  router.get("/attendance/register", async (req, res) =>
    res.json(await attendanceRegister(registerQuery.parse(req.query))),
  );
  router.post("/attendance/bulk", async (req, res) =>
    res.json(await saveAttendance(attendanceBatch.parse(req.body))),
  );
  router.get("/students/import/template.csv", (req, res) =>
    res
      .type("text/csv")
      .attachment("campusdesk-students-template.csv")
      .send(studentFields.join(",") + "\r\n"),
  );
  router.post("/students/import/preview", async (req, res) =>
    res.json(await previewImport(importInput.parse(req.body))),
  );
  router.post("/students/import", async (req, res) =>
    res.json(
      await commitImport(importConfirmation.parse(req.body), req.admin._id),
    ),
  );
}
