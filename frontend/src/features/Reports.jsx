import React, { useState } from "react";
import { Download } from "lucide-react";
import { Heading, SimpleTable, useData } from "../components/WorkspaceUI";
import { Chart } from "../components/LazyChart";
import { Message, Loading } from "../components/Feedback";
import { AcademicIcon } from "../components/Brand";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { download } from "../api";

const reports = {
  departments: {
    title: "Departments",
    note: "Student distribution across your academic departments",
    columns: ["_id", "count"],
  },
  years: {
    title: "Academic years",
    note: "Student records by academic year",
    columns: ["_id", "count"],
  },
  courseEnrollments: {
    title: "Enrollments",
    note: "Non-withdrawn enrollments per course",
    columns: ["course", "count"],
  },
  attendance: {
    title: "Attendance",
    note: "Present and late count as attended. Missing sessions are excluded.",
    columns: ["course", "department", "recorded", "attended", "percentage"],
    percent: true,
  },
  performance: {
    title: "Performance",
    note: "Total marks / total maximum marks per course. No GPA is calculated.",
    columns: ["course", "assessments", "marks", "maxMarks", "percentage"],
    percent: true,
  },
};
export default function Reports() {
  const empty = {
    department: "",
    academicYear: "",
    semester: "",
    course: "",
    term: "",
    dateFrom: "",
    dateTo: "",
  };
  const [draft, setDraft] = useState(empty),
    [filters, setFilters] = useState(""),
    [courseSearch, setCourseSearch] = useState(""),
    [chosenCourse, setChosenCourse] = useState(null);
  const search = useDebouncedValue(courseSearch);
  const courses = useData(
    ["report-courses", search],
    "/courses?limit=30&search=" + encodeURIComponent(search),
  );
  const choices = [...(courses.data?.items || [])];
  if (chosenCourse && !choices.some((item) => item._id === chosenCourse._id))
    choices.unshift(chosenCourse);
  const q = useData(
      ["reports", filters],
      "/reports" + (filters ? "?" + filters : ""),
    ),
    [active, setActive] = useState("departments"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null);
  const config = reports[active];
  const exportReport = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await download(active, filters);
      setNotice({
        text: "CSV download prepared. Check your browser downloads.",
      });
    } catch (error) {
      setNotice({ error: true, text: error.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title="Academic reports"
        description="A considered view of your institution. Ready to explore and export."
        action={
          <button
            disabled={busy || q.isPending || !!q.error || !q.data}
            className="primary"
            onClick={exportReport}
          >
            <Download size={16} />
            {busy ? "Preparing CSV…" : "Export CSV"}
          </button>
        }
      />
      <div className="report-tabs" role="group" aria-label="Report type">
        {Object.entries(reports).map(([key, value]) => (
          <button
            key={key}
            aria-pressed={active === key}
            onClick={() => {
              setActive(key);
              setNotice(null);
            }}
          >
            {value.title}
          </button>
        ))}
      </div>
      <form
        className="panel report-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const values = Object.entries(draft).filter(
            ([, value]) => value !== "",
          );
          setFilters(new URLSearchParams(values).toString());
          setNotice(null);
        }}
      >
        <div className="report-filter-heading">
          <h2>Refine your view</h2>
          <span>
            Exact academic context · applied to the table, chart and export
          </span>
        </div>
        {[
          ["department", "Department"],
          ["academicYear", "Academic year"],
          ["term", "Assessment / enrollment term"],
        ].map(([key, title]) => (
          <label key={key} htmlFor={"report-" + key}>
            {title}
            <input
              id={"report-" + key}
              maxLength={120}
              value={draft[key]}
              placeholder="All"
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <div className="report-filter-field">
          <label htmlFor="report-semester">Semester</label>
          <select
            id="report-semester"
            value={draft.semester}
            onChange={(event) =>
              setDraft({ ...draft, semester: event.target.value })
            }
          >
            <option value="">All semesters</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <label htmlFor="report-search">
          Find report course
          <input
            id="report-search"
            value={courseSearch}
            placeholder="Search course code or name…"
            onChange={(event) => setCourseSearch(event.target.value)}
          />
        </label>
        <div className="report-filter-field">
          <label htmlFor="report-course">Course</label>
          <select
            id="report-course"
            value={draft.course}
            onChange={(event) => {
              setDraft({ ...draft, course: event.target.value });
              setChosenCourse(
                choices.find((item) => item._id === event.target.value) || null,
              );
            }}
          >
            <option value="">All courses</option>
            {choices.map((item) => (
              <option key={item._id} value={item._id}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
        </div>
        <label htmlFor="report-from">
          Attendance from
          <input
            id="report-from"
            type="date"
            max={draft.dateTo || undefined}
            value={draft.dateFrom}
            onChange={(event) =>
              setDraft({ ...draft, dateFrom: event.target.value })
            }
          />
        </label>
        <label htmlFor="report-to">
          Attendance through
          <input
            id="report-to"
            type="date"
            min={draft.dateFrom || undefined}
            value={draft.dateTo}
            onChange={(event) =>
              setDraft({ ...draft, dateTo: event.target.value })
            }
          />
        </label>
        <div className="report-filter-actions">
          <button className="primary" type="submit" disabled={q.isFetching}>
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(empty);
              setFilters("");
              setCourseSearch("");
              setChosenCourse(null);
              setNotice(null);
            }}
          >
            Reset filters
          </button>
          <span role="status">
            {filters ? "Filtered results" : "All recorded data"}
            {new URLSearchParams(
              Object.entries(draft).filter(([, v]) => v !== ""),
            ).toString() !== filters
              ? " · Changes not applied"
              : ""}
          </span>
        </div>
        <p>
          Dates filter recorded attendance only. Term filters enrollments and
          assessments; attendance uses the course academic year. Course or term
          selections restrict student distributions to non-withdrawn
          enrollments. Department and academic year are exact matches.
        </p>
        {courses.error && <Message error>{courses.error.message}</Message>}
      </form>
      {notice && <Message error={notice.error}>{notice.text}</Message>}
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <>
          <Message error>{q.error.message}</Message>
          <button onClick={() => q.refetch()}>Try again</button>
        </>
      ) : (
        <>
          <div className="report-intro">
            <span className="quick-icon">
              <AcademicIcon kind="reports" />
            </span>
            <div>
              <h2>{config.title}</h2>
              <p>{config.note}</p>
            </div>
            <span className="badge">{q.data[active].length} groups</span>
          </div>
          <Chart
            title={config.title + " overview"}
            description={config.note}
            data={q.data[active].map((row) => ({
              ...row,
              _id: row.course || row._id,
            }))}
            valueKey={config.percent ? "percentage" : "count"}
            unit={config.percent ? "%" : ""}
          />
          <section className="panel history">
            <div className="panel-head">
              <div>
                <h2>Behind the numbers</h2>
                <p>Exact values included in the CSV export</p>
              </div>
            </div>
            <SimpleTable rows={q.data[active]} columns={config.columns} />
          </section>
          <p className="report-footnote">
            Reports reflect recorded data, not inferred sessions or forecast
            results. CSV exports are authenticated and spreadsheet-safe.
          </p>
        </>
      )}
    </>
  );
}
