import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, Save } from "lucide-react";
import { api } from "../api";
import { Heading } from "../components/WorkspaceUI";
import { Message, Loading, Empty, Modal } from "../components/Feedback";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export default function AttendanceRegister() {
  const qc = useQueryClient(),
    [search, setSearch] = useState(""),
    [course, setCourse] = useState(""),
    [date, setDate] = useState(today),
    [page, setPage] = useState(1),
    [draft, setDraft] = useState({}),
    [selected, setSelected] = useState(new Set()),
    [review, setReview] = useState(false),
    [notice, setNotice] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const caps = useQuery({
    queryKey: ["operation-capabilities"],
    queryFn: () => api("/operations/capabilities"),
    staleTime: 300000,
  });
  const courses = useQuery({
    queryKey: ["register-courses", debouncedSearch],
    queryFn: () =>
      api("/courses?limit=30&search=" + encodeURIComponent(debouncedSearch)),
  });
  const register = useQuery({
    queryKey: ["attendance-register", course, date, page],
    queryFn: ({ signal }) =>
      api(
        `/attendance/register?course=${course}&date=${date}&page=${page}&limit=25`,
        { signal },
      ),
    enabled: !!course && !!date,
  });
  const courseOptions = [...(courses.data?.items || [])];
  if (
    course &&
    register.data?.course &&
    !courseOptions.some((item) => item._id === course)
  )
    courseOptions.unshift(register.data.course);
  const dirty = Object.keys(draft).length > 0;
  useUnsavedChanges(dirty);
  const save = useMutation({
    mutationFn: () =>
      api("/attendance/bulk", {
        method: "POST",
        body: JSON.stringify({
          course,
          date,
          records: Object.entries(draft).map(([student, value]) => ({
            student,
            ...value,
          })),
        }),
      }),
    onSuccess: async (result) => {
      await qc.invalidateQueries();
      setDraft({});
      setSelected(new Set());
      setReview(false);
      setNotice(
        `${result.created} created, ${result.updated} updated, ${result.unchanged} already recorded. All ${result.total} submitted rows confirmed.`,
      );
    },
  });
  const clear = () => {
    setDraft({});
    setSelected(new Set());
    save.reset();
  };
  const context = (change) => {
    if (dirty && !window.confirm("Discard unsaved attendance changes?")) return;
    clear();
    setNotice("");
    change();
  };
  const choose = (row, status) =>
    setDraft((previous) => {
      const next = { ...previous },
        id = row.student._id;
      if (status === row.attendance?.status) delete next[id];
      else
        next[id] = {
          status,
          expectedRevision: previous[id]
            ? previous[id].expectedRevision
            : row.attendance
              ? row.attendance.revision
              : null,
        };
      return next;
    });
  const mark = (status, onlySelected = false) => {
    for (const row of register.data?.items || [])
      if (!onlySelected || selected.has(row.student._id)) choose(row, status);
    setNotice("");
  };
  const entries = Object.entries(draft);
  return (
    <>
      <Link className="back" to="/attendance">
        <ChevronLeft size={16} />
        Attendance records
      </Link>
      <Heading
        title="Attendance register"
        description="One course. One session. Every student accounted for."
      />
      {caps.isPending ? (
        <Loading />
      ) : caps.error ? (
        <Message error>{caps.error.message}</Message>
      ) : !caps.data.atomicBatches ? (
        <Message error>
          Batch saving is unavailable on this database. A replica set is
          required; individual attendance records remain available.
        </Message>
      ) : (
        <>
          <section className="panel register-context">
            <label>
              Find a course
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search course code or name…"
              />
            </label>
            <div className="register-context-field">
              <label htmlFor="register-course">Course</label>
              <select
                id="register-course"
                value={course}
                disabled={save.isPending}
                onChange={(event) =>
                  context(() => {
                    setCourse(event.target.value);
                    setPage(1);
                  })
                }
              >
                <option value="">Choose a course</option>
                {courseOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </div>
            <label>
              Session date
              <input
                type="date"
                required
                value={date}
                disabled={save.isPending}
                onChange={(event) =>
                  context(() => {
                    setDate(event.target.value);
                    setPage(1);
                  })
                }
              />
            </label>
            <p>
              Search to find courses beyond the first 30. Only compatible
              active/completed enrollments are eligible. Missing records stay
              unmarked.
            </p>
          </section>
          {courses.error && <Message error>{courses.error.message}</Message>}
          {notice && <Message>{notice}</Message>}
          {(dirty || save.error) && (
            <div className="register-savebar">
              <div>
                <strong>{entries.length} unsaved changes</strong>
                <small>
                  {["present", "absent", "late"]
                    .map(
                      (status) =>
                        entries.filter(([, row]) => row.status === status)
                          .length +
                        " " +
                        status,
                    )
                    .join(" · ")}
                </small>
              </div>
              <button onClick={clear} disabled={save.isPending}>
                Clear changes
              </button>
              <button
                className="primary"
                disabled={!dirty || save.isPending}
                onClick={() => {
                  save.reset();
                  setReview(true);
                }}
              >
                <Save size={16} />
                Review changes
              </button>
            </div>
          )}
          {!course || !date ? (
            <section className="panel">
              <Empty
                kind="attendance"
                text="Choose a course and session date to open its attendance register."
              />
            </section>
          ) : register.isPending ? (
            <Loading />
          ) : register.error ? (
            <>
              <Message error>{register.error.message}</Message>
              <button onClick={() => register.refetch()}>Retry register</button>
            </>
          ) : (
            <section className="panel register-panel">
              <div className="panel-head">
                <div>
                  <h2>{register.data.course.name}</h2>
                  <p>
                    {register.data.course.code} ·{" "}
                    {register.data.course.academicYear} · {date}
                  </p>
                </div>
                <span className="badge">{register.data.total} eligible</span>
              </div>
              <div className="batch-actions">
                <button
                  disabled={!register.data.items.length}
                  onClick={() => mark("present")}
                >
                  Mark all present
                </button>
                <button
                  disabled={!selected.size}
                  onClick={() => mark("absent", true)}
                >
                  Mark selected absent
                </button>
                <button
                  disabled={!selected.size}
                  onClick={() => mark("late", true)}
                >
                  Mark selected late
                </button>
                <span>
                  Applies to this page only. Unmarked rows are unchanged.
                </span>
              </div>
              {register.data.items.length ? (
                register.data.items.map((row) => {
                  const id = row.student._id,
                    value = draft[id]?.status || row.attendance?.status || "";
                  return (
                    <div
                      className={
                        "register-row " + (draft[id] ? "is-dirty" : "")
                      }
                      key={id}
                    >
                      <label className="row-selection">
                        <span className="sr-only">
                          Select {row.student.firstName} {row.student.lastName}
                        </span>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={(event) =>
                            setSelected((previous) => {
                              const next = new Set(previous);
                              event.target.checked
                                ? next.add(id)
                                : next.delete(id);
                              return next;
                            })
                          }
                        />
                      </label>
                      <div className="register-student">
                        <strong>
                          {row.student.firstName} {row.student.lastName}
                        </strong>
                        <small>
                          {row.student.studentId} ·{" "}
                          {draft[id]
                            ? "Unsaved"
                            : row.attendance
                              ? "Recorded"
                              : "Not recorded"}
                        </small>
                      </div>
                      <fieldset className="attendance-choices">
                        <legend className="sr-only">
                          Attendance for {row.student.firstName}{" "}
                          {row.student.lastName}
                        </legend>
                        {["present", "absent", "late"].map((status) => (
                          <label key={status}>
                            <input
                              type="radio"
                              name={"attendance-" + id}
                              value={status}
                              checked={value === status}
                              onChange={() => choose(row, status)}
                            />
                            <span>
                              {status[0].toUpperCase() + status.slice(1)}
                            </span>
                            {value === status && (
                              <Check size={13} aria-hidden="true" />
                            )}
                          </label>
                        ))}
                      </fieldset>
                    </div>
                  );
                })
              ) : (
                <Empty
                  kind="attendance"
                  text="No eligible enrollments for this course. Add a compatible enrollment first."
                />
              )}
              <div className="pagination">
                <span>
                  Page {page} of {Math.max(1, register.data.pages)} ·{" "}
                  {register.data.items.length} students shown
                </span>
                <div>
                  <button
                    aria-label="Previous register page"
                    disabled={page === 1}
                    onClick={() => context(() => setPage(page - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    aria-label="Next register page"
                    disabled={page >= register.data.pages}
                    onClick={() => context(() => setPage(page + 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {save.error && (
            <div className="batch-error">
              <Message error>{save.error.message}</Message>
              <button
                onClick={() =>
                  context(() => {
                    register.refetch();
                    setReview(false);
                  })
                }
              >
                Reload register
              </button>
            </div>
          )}
          {review && (
            <Modal
              title="Review attendance"
              busy={save.isPending}
              onClose={() => {
                if (!save.isPending) setReview(false);
              }}
            >
              <div className="dialog-copy">
                <p>
                  {entries.length} marked students will be saved together.
                  Unmarked students will not be changed. A conflict rejects the
                  entire batch.
                </p>
                <ul className="review-list">
                  {entries.map(([id, value]) => (
                    <li key={id}>
                      <span>
                        {
                          register.data.items.find(
                            (row) => row.student._id === id,
                          )?.student.studentId
                        }
                      </span>
                      <strong>{value.status}</strong>
                    </li>
                  ))}
                </ul>
                {save.error && <Message error>{save.error.message}</Message>}
              </div>
              <div className="dialog-actions">
                <button
                  disabled={save.isPending}
                  onClick={() => setReview(false)}
                >
                  Back to register
                </button>
                <button
                  className="primary"
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "Saving attendance…" : "Save attendance"}
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </>
  );
}
