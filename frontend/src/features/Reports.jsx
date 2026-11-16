import React, { useState } from "react";
import { Download } from "lucide-react";
import { Heading, SimpleTable, useData } from "../components/WorkspaceUI";
import { Chart } from "../components/LazyChart";
import { Message, Loading } from "../components/Feedback";
import { AcademicIcon } from "../components/Brand";
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
  const q = useData(["reports"], "/reports"),
    [active, setActive] = useState("departments"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null);
  const config = reports[active];
  const exportReport = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await download(active);
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
            disabled={busy || !q.data}
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
