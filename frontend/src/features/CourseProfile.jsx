import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useData, Heading } from "../components/WorkspaceUI";
import { Message, Loading, Empty } from "../components/Feedback";
import { AcademicIcon } from "../components/Brand";

export default function CourseProfile() {
  const { id } = useParams(),
    [page, setPage] = useState(1);
  const course = useData(["course", id], "/courses/" + id);
  const roster = useData(
    ["course-roster", id, page],
    "/enrollments?course=" +
      encodeURIComponent(id) +
      "&page=" +
      page +
      "&limit=20",
  );
  if (course.isPending) return <Loading />;
  if (course.error) return <Message error>{course.error.message}</Message>;
  const c = course.data;
  return (
    <>
      <Link className="back" to="/courses">
        <ChevronLeft size={16} />
        All courses
      </Link>
      <Heading
        title={c.name}
        description={c.code + " · " + c.department}
        action={
          <Link
            className="primary"
            to={"/enrollments?course=" + id + "&action=new"}
          >
            Manage enrollment <ArrowUpRight size={15} />
          </Link>
        }
      />
      <section className="panel profile">
        <span className="student-avatar large">
          <AcademicIcon kind="courses" size={34} />
        </span>
        <div className="detail-grid">
          {[
            ["Course code", c.code],
            ["Faculty", c.facultyName],
            ["Credits", c.credits],
            ["Department", c.department],
            ["Semester", c.semester],
            ["Academic year", c.academicYear],
          ].map(([key, value]) => (
            <div key={key}>
              <small>{key}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel history">
        <div className="panel-head">
          <div>
            <h2>Course roster</h2>
            <p>Enrollment records, including completed and withdrawn history</p>
          </div>
          <span className="badge">{roster.data?.total ?? "…"} records</span>
        </div>
        {roster.isPending ? (
          <Loading />
        ) : roster.error ? (
          <>
            <Message error>{roster.error.message}</Message>
            <button onClick={() => roster.refetch()}>Retry roster</button>
          </>
        ) : roster.data.items.length ? (
          <>
            {roster.data.items.map((r) => (
              <div className="recent" key={r._id}>
                <span className="student-avatar">
                  <AcademicIcon kind="students" size={19} />
                </span>
                <div>
                  {r.student ? (
                    <Link to={"/students/" + r.student._id}>
                      <strong>
                        {r.student.firstName} {r.student.lastName}
                      </strong>
                    </Link>
                  ) : (
                    <strong>Student unavailable</strong>
                  )}
                  <small>
                    {r.student?.studentId} · {r.term}
                  </small>
                </div>
                <span
                  className={"badge " + r.status}
                  style={{ marginLeft: "auto" }}
                >
                  {r.status}
                </span>
              </div>
            ))}
            <div className="pagination">
              <span>
                Page {page} of {roster.data.pages} · {roster.data.total} records
              </span>
              <div>
                <button
                  aria-label="Previous roster page"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next roster page"
                  disabled={page >= roster.data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            kind="courses"
            text="No students are enrolled in this course yet."
          />
        )}
      </section>
    </>
  );
}
