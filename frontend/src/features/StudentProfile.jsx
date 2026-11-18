import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { modules } from "../config";
import { Heading, SimpleTable, useData } from "../components/WorkspaceUI";
import { Message, Loading } from "../components/Feedback";
export default function StudentProfile() {
  const [section, setSection] = useState("Enrolled courses");
  const { id } = useParams(),
    q = useData(["profile", id], "/students/" + id + "/history");
  if (q.isPending) return <Loading />;
  if (q.error) return <Message error>{q.error.message}</Message>;
  const { student, attendancePercentage, attendance, grades, enrollments } =
    q.data;
  return (
    <>
      <Link className="back" to="/students">
        <ChevronLeft size={16} />
        All students
      </Link>
      <Heading
        title={student.firstName + " " + student.lastName}
        description={student.studentId + " · " + student.department}
      />
      <div className="profile-overview">
        <span className={"badge " + student.status}>{student.status}</span>
        <span className="badge">Semester {student.semester}</span>
        <span className="badge">{student.academicYear}</span>
        <span className="badge">Section {student.section}</span>
      </div>
      <section className="panel profile">
        <span className="student-avatar large">
          {student.firstName[0]}
          {student.lastName[0]}
        </span>
        <div className="detail-grid">
          {modules.students.fields.map((f) => (
            <div key={f.key}>
              <small>{f.label}</small>
              <strong>{student[f.key] || "—"}</strong>
            </div>
          ))}
          <div>
            <small>Created</small>
            <strong>{new Date(student.createdAt).toLocaleString()}</strong>
          </div>
          <div>
            <small>Updated</small>
            <strong>{new Date(student.updatedAt).toLocaleString()}</strong>
          </div>
        </div>
      </section>
      <div className="profile-attendance">
        <h2>
          Attendance:{" "}
          {attendancePercentage === null
            ? "No recorded sessions"
            : attendancePercentage.toFixed(1) + "%"}
        </h2>
        {attendancePercentage !== null && attendancePercentage < 75 && (
          <Message error>
            Low attendance: below the 75% advisory threshold.
          </Message>
        )}
        <p className="muted">
          Present and late count as attended; missing records are excluded.
          History lists show up to 500 entries; attendance percentage uses all
          records.
        </p>
      </div>
      <div
        className="report-tabs"
        role="group"
        aria-label="Student academic history"
      >
        {["Enrolled courses", "Attendance history", "Academic results"].map(
          (title) => (
            <button
              key={title}
              aria-pressed={section === title}
              onClick={() => setSection(title)}
            >
              {title}
            </button>
          ),
        )}
      </div>
      {[
        ["Enrolled courses", enrollments, ["course", "term", "status"]],
        ["Attendance history", attendance, ["course", "date", "status"]],
        [
          "Academic results",
          grades,
          ["course", "assessment", "marks", "maxMarks", "percentage", "letter"],
        ],
      ]
        .filter(([title]) => title === section)
        .map(([title, rows, columns]) => (
          <section className="panel history" key={title}>
            <div className="panel-head">
              <h2>{title}</h2>
              {title === "Academic results" && grades.length > 0 && (
                <span className="muted">
                  Recorded assessments:{" "}
                  {(
                    (grades.reduce((n, g) => n + g.marks, 0) /
                      grades.reduce((n, g) => n + g.maxMarks, 0)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              )}
            </div>
            <SimpleTable rows={rows} columns={columns} />
          </section>
        ))}
    </>
  );
}
