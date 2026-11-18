import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight, ChevronRight } from "lucide-react";
import { AcademicIcon, BrandMark, Illustration } from "../components/Brand";
import { Heading, useData } from "../components/WorkspaceUI";
import { Message, Loading, Empty } from "../components/Feedback";
import { Chart } from "../components/LazyChart";

export default function Dashboard() {
  const capabilities = useData(
    ["operation-capabilities"],
    "/operations/capabilities",
  );
  const q = useData(["reports"], "/reports"),
    navigate = useNavigate();
  if (q.isPending) return <Loading />;
  if (q.error)
    return (
      <>
        <Heading
          title="Campus overview"
          description="Your academic workspace, at a glance."
        />
        <Message error>{q.error.message}</Message>
        <button onClick={() => q.refetch()}>Try again</button>
      </>
    );
  const d = q.data,
    m = d.metrics;
  const marks = d.performance.reduce((sum, item) => sum + item.marks, 0);
  const maximum = d.performance.reduce((sum, item) => sum + item.maxMarks, 0);
  const assessments = d.performance.reduce(
    (sum, item) => sum + item.assessments,
    0,
  );
  return (
    <div className="dashboard-page">
      <Heading
        title="Campus overview"
        description="The people, the progress, the possibilities. All connected."
        action={
          <Link className="primary" to="/students?action=new">
            <Plus size={16} />
            Add student
          </Link>
        }
      />
      <section className="spectrum-hero">
        <div>
          <span className="eyebrow">CAMPUSDESK SPECTRUM</span>
          <h2>A clearer view of your campus.</h2>
          <p>
            People, learning and everyday progress. Connected through your
            academic records.
          </p>
          <div className="hero-actions">
            <Link
              className="primary"
              to={
                capabilities.data?.atomicBatches
                  ? "/attendance/register"
                  : "/attendance"
              }
            >
              {capabilities.data?.atomicBatches
                ? "Open attendance register"
                : "View attendance"}
            </Link>
            <Link className="secondary-action" to="/reports">
              Explore reports
            </Link>
          </div>
        </div>
        <svg
          className="hero-art"
          viewBox="0 0 160 140"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m80 8 64 36-64 36L16 44 80 8Z"
            fill="var(--accent)"
            fillOpacity=".18"
            stroke="currentColor"
          />
          <path
            d="M16 44v52l64 36V80L16 44Zm128 0v52l-64 36V80l64-36Z"
            fill="var(--spectrum-blue)"
            fillOpacity=".15"
            stroke="currentColor"
          />
          <path
            d="m44 61 36 20 36-20M80 30v29m-16-9 16 9 16-9"
            stroke="var(--mint)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="130"
            cy="19"
            r="8"
            fill="var(--spectrum-rose)"
            fillOpacity=".5"
          />
        </svg>
      </section>
      <div className="overview-note">
        <span className="dot" />
        From your academic records
        <span>People and progress, in perspective.</span>
      </div>
      <div className="stats">
        {[
          [
            "Total students",
            m.students,
            "students",
            "Registered student records",
            "/students",
          ],
          [
            "Active students",
            m.activeStudents,
            "enrollments",
            "Student records with active status",
            "/students?status=active",
          ],
          [
            "Courses",
            m.courses,
            "courses",
            "Across your academic curriculum",
            "/courses",
          ],
          [
            "Attendance",
            m.attendancePercentage === null
              ? "—"
              : m.attendancePercentage.toFixed(1) + "%",
            "attendance",
            "Present + late / recorded sessions",
            "/attendance",
          ],
        ].map(([title, value, kind, note, to]) => (
          <Link className="stat metric-link" key={title} to={to}>
            <div>
              <span>{title}</span>
              <span className="metric-icon">
                <AcademicIcon kind={kind} size={23} />
              </span>
            </div>
            <strong>
              {typeof value === "number" ? value.toLocaleString() : value}
            </strong>
            <small>{note}</small>
            <ChevronRight className="metric-arrow" size={16} />
          </Link>
        ))}
      </div>
      {m.students === 0 && (
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Room for your next chapter</span>
            <h2>Start with the people who make your campus.</h2>
            <p>
              Add a student, organize a course, and build a connected academic
              record.
            </p>
            <div>
              <Link className="primary" to="/students?action=new">
                <Plus size={15} />
                Add your first student
              </Link>
              <Link to="/courses?action=new">
                Create a course <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <Illustration kind="students" />
        </section>
      )}
      <div className="dashboard-analytics">
        <Chart
          title="Students by department"
          description="A shared campus, different disciplines"
          data={d.departments}
          onSelect={(department) =>
            navigate("/students?department=" + encodeURIComponent(department))
          }
        />
        <Chart
          title="Enrollment activity"
          description="New course enrollments by month"
          data={d.enrollmentTrends}
          line
        />
      </div>
      <div className="academic-pulse">
        <div className="pulse-label">
          <BrandMark size={30} />
          <div>
            <h2>The academic picture</h2>
            <p>Recorded outcomes, without assumptions</p>
          </div>
        </div>
        <div>
          <strong>{m.enrollments.toLocaleString()}</strong>
          <span>Non-withdrawn enrollments</span>
        </div>
        <div>
          <strong>
            {maximum ? ((marks / maximum) * 100).toFixed(1) + "%" : "—"}
          </strong>
          <span>Weighted assessment result</span>
        </div>
        <div>
          <strong>{assessments.toLocaleString()}</strong>
          <span>Recorded assessments</span>
        </div>
      </div>
      <section
        className="workflow-strip glass-expressive"
        aria-label="Quick actions"
      >
        {[
          ...(capabilities.data?.atomicBatches
            ? [
                [
                  "import",
                  "Import students",
                  "Preview before you save",
                  "/students/import",
                ],
              ]
            : []),
          [
            "courses",
            "Create a course",
            "Shape your curriculum",
            "/courses?action=new",
          ],
          [
            "attendance",
            "Record attendance",
            "Make every session count",
            "/attendance",
          ],
          [
            "reports",
            "Explore reports",
            "A useful view of progress",
            "/reports",
          ],
        ].map(([kind, title, note, to]) => (
          <Link key={kind} to={to}>
            <span className="quick-icon">
              <AcademicIcon kind={kind} />
            </span>
            <div>
              <strong>{title}</strong>
              <small>{note}</small>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </section>
      <div className="grid-two dashboard-bottom">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recently added students</h2>
              <p>A new part of your campus story</p>
            </div>
            <Link to="/students">
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          {d.recentStudents.length ? (
            d.recentStudents.map((s) => (
              <Link key={s._id} className="recent" to={"/students/" + s._id}>
                <span className="student-avatar">
                  {s.firstName[0]}
                  {s.lastName[0]}
                </span>
                <div>
                  <strong>
                    {s.firstName} {s.lastName}
                  </strong>
                  <small>{s.studentId}</small>
                </div>
                <time>{new Date(s.createdAt).toLocaleDateString()}</time>
              </Link>
            ))
          ) : (
            <Empty
              kind="students"
              text="Your newest student records will appear here."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent academic activity</h2>
              <p>The latest changes across your workspace</p>
            </div>
          </div>
          {d.recentActivity?.length ? (
            d.recentActivity.slice(0, 5).map((a) => (
              <Link
                key={a.module + a.id}
                className="recent"
                to={
                  a.module === "students" ? "/students/" + a.id : "/" + a.module
                }
              >
                <span className="student-avatar">
                  <AcademicIcon kind={a.module} size={19} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>{a.detail}</small>
                </div>
                <time>{new Date(a.updatedAt).toLocaleDateString()}</time>
              </Link>
            ))
          ) : (
            <Empty
              kind="reports"
              text="Activity appears when academic records are created or updated."
            />
          )}
        </section>
      </div>
    </div>
  );
}
