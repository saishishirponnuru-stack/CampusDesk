import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { AcademicIcon } from "./Brand";
import { modules, label } from "../config";

export function MobileRecord({ kind, row, onEdit, onDelete }) {
  const student = kind === "students" ? row : row.student;
  const title =
    kind === "courses"
      ? row.name
      : student
        ? student.firstName + " " + student.lastName
        : "Student unavailable";
  const destination =
    kind === "courses"
      ? "/courses/" + row._id
      : student?._id
        ? "/students/" + student._id
        : null;
  const info = ["students", "courses"].includes(kind)
    ? [
        ["Department", row.department],
        ["Academic year", row.academicYear],
        ["Semester", row.semester],
        ...(kind === "courses"
          ? [
              ["Faculty", row.facultyName],
              ["Credits", row.credits],
            ]
          : []),
      ]
    : [
        ["Course", row.course?.name || "Unavailable"],
        ...(kind === "attendance"
          ? [["Session date", row.date]]
          : [["Academic term", row.term]]),
        ...(kind === "grades"
          ? [
              ["Assessment", row.assessment],
              ["Marks", row.marks + " / " + row.maxMarks],
              [
                "Result",
                Number(row.percentage).toFixed(1) + "% · " + row.letter,
              ],
            ]
          : []),
      ];
  return (
    <article className="mobile-record">
      <div className="mobile-record-identity">
        <span className="student-avatar" aria-hidden="true">
          {student ? (
            student.firstName[0] + student.lastName[0]
          ) : (
            <AcademicIcon kind={kind} size={20} />
          )}
        </span>
        <div>
          {destination ? (
            <Link to={destination}>
              <strong>{title}</strong>
            </Link>
          ) : (
            <strong>{title}</strong>
          )}
          <small>{kind === "courses" ? row.code : student?.studentId}</small>
        </div>
        {row.status && (
          <span className={"badge " + row.status}>{label(row.status)}</span>
        )}
      </div>
      <dl>
        {info.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mobile-record-actions">
        {destination && (
          <Link to={destination}>
            {kind === "courses" ? "View course" : "View student"}
            <ArrowUpRight size={13} />
          </Link>
        )}
        <button aria-label={"Edit " + modules[kind].singular} onClick={onEdit}>
          <Pencil size={15} />
          Edit
        </button>
        <button
          className="danger icon-button"
          aria-label={"Delete " + modules[kind].singular}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
