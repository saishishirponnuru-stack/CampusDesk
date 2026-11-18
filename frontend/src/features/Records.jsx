import React, { useState, useEffect, useId } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../api";
import { modules, label } from "../config";
import { Message, Loading, Empty, Modal } from "../components/Feedback";
import { Heading, display, useData } from "../components/WorkspaceUI";
import { MobileRecord } from "../components/MobileRecord";
import { EntityCombobox, CoursePicker } from "../components/EntityCombobox";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { ModuleIcon } from "../components/ModuleIcon";
export function RecordForm({ kind, record, onClose }) {
  const formId = useId();
  const config = modules[kind],
    qc = useQueryClient();
  const [entities, setEntities] = useState({
    student: record?.student || null,
    course: record?.course || null,
  });
  const relationKind = ["enrollments", "attendance", "grades"].includes(kind);
  const shape = Object.fromEntries(
    config.fields.map((f) => [
      f.key,
      f.type === "number"
        ? z.coerce
            .number()
            .min(f.key === "marks" ? 0 : 1)
            .max(f.key === "semester" ? 12 : f.key === "credits" ? 10 : 100000)
        : f.type === "select"
          ? z.enum(f.options)
          : ["student", "course"].includes(f.type)
            ? z.string().regex(/^[a-f\d]{24}$/i, "Select a valid record")
            : f.type === "date"
              ? z.iso.date()
              : f.key === "email"
                ? z.email().max(254)
                : f.key === "phone"
                  ? z.string().max(30)
                  : z.string().trim().min(1, "Required").max(120),
    ]),
  );
  if (shape.semester)
    shape.semester = shape.semester.refine(
      Number.isInteger,
      "Use a whole semester number",
    );
  let schema = z.object(shape);
  if (kind === "grades")
    schema = schema.refine((v) => v.marks <= v.maxMarks, {
      message: "Marks cannot exceed maximum",
      path: ["marks"],
    });
  const defaults = Object.fromEntries(
    config.fields.map((f) => [
      f.key,
      record?.[f.key]?._id ??
        record?.[f.key] ??
        (f.type === "select"
          ? f.options[0]
          : f.key === "date"
            ? new Date().toISOString().slice(0, 10)
            : ""),
    ]),
  );
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({ defaultValues: defaults, resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (values) =>
      api("/" + kind + (record ? "/" + record._id : ""), {
        method: record ? "PUT" : "POST",
        ...(record?.updatedAt
          ? { headers: { "If-Match": JSON.stringify(record.updatedAt) } }
          : {}),
        body: JSON.stringify(values),
      }),
    onError: (err) => {
      if (err.status === 409) qc.invalidateQueries();
    },
    onSuccess: () => {
      qc.invalidateQueries();
      onClose("Record saved successfully.");
    },
  });
  const close = () => {
    if (mutation.isPending) return;
    if (!isDirty || window.confirm("Discard your unsaved changes?")) onClose();
  };
  useUnsavedChanges(isDirty);
  const marks = watch("marks"),
    maximum = watch("maxMarks"),
    term = watch("term");
  const mismatches = [];
  if (entities.student && entities.course) {
    for (const [key, name] of [
      ["department", "department"],
      ["academicYear", "academic year"],
      ["semester", "semester"],
    ]) {
      if (
        entities.student[key] != null &&
        entities.course[key] != null &&
        String(entities.student[key]) !== String(entities.course[key])
      )
        mismatches.push(
          `Student ${name}: ${entities.student[key]}; course ${name}: ${entities.course[key]}.`,
        );
    }
    if (
      term &&
      entities.course.academicYear &&
      term !== entities.course.academicYear
    )
      mismatches.push(
        `Term must match the course academic year (${entities.course.academicYear}).`,
      );
    if (
      kind === "enrollments" &&
      watch("status") === "active" &&
      entities.student.status &&
      entities.student.status !== "active"
    )
      mismatches.push("Active enrollment requires an active student.");
  }
  return (
    <Modal
      title={(record ? "Edit " : "Add ") + config.singular}
      onClose={close}
      busy={mutation.isPending}
    >
      <form
        onChangeCapture={() => {
          if (mutation.error?.status === 422) mutation.reset();
        }}
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
      >
        <fieldset className="form-grid" disabled={mutation.isPending}>
          {config.fields.map((f, index) => (
            <React.Fragment key={f.key}>
              {kind === "students" && [0, 2, 6, 11].includes(index) && (
                <h3 className="form-section-title">
                  {
                    {
                      0: "Identification",
                      2: "Personal information",
                      6: "Academic context",
                      11: "Record status",
                    }[index]
                  }
                </h3>
              )}
              <div className="form-field">
                <div className="field-label">
                  <label htmlFor={formId + f.key}>{f.label}</label>
                  {f.key === "phone" ? (
                    <small>Optional</small>
                  ) : (
                    <span aria-hidden="true" className="required-mark">
                      *
                    </span>
                  )}
                </div>
                {f.type === "select" ? (
                  <select
                    id={formId + f.key}
                    aria-invalid={!!errors[f.key]}
                    aria-describedby={
                      errors[f.key] ? formId + f.key + "-error" : undefined
                    }
                    required
                    {...register(f.key)}
                  >
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {label(o)}
                      </option>
                    ))}
                  </select>
                ) : ["student", "course"].includes(f.type) ? (
                  <Controller
                    name={f.key}
                    control={control}
                    render={({ field }) => (
                      <EntityCombobox
                        kind={f.type === "student" ? "students" : "courses"}
                        id={formId + f.key}
                        value={field.value}
                        initialEntity={record?.[f.key]}
                        disabled={mutation.isPending}
                        invalid={!!errors[f.key]}
                        describedBy={
                          errors[f.key] ? formId + f.key + "-error" : undefined
                        }
                        onChange={(id, entity) => {
                          field.onChange(id);
                          setEntities((old) => ({ ...old, [f.type]: entity }));
                        }}
                      />
                    )}
                  />
                ) : (
                  <input
                    id={formId + f.key}
                    aria-invalid={!!errors[f.key]}
                    aria-describedby={
                      errors[f.key] ? formId + f.key + "-error" : undefined
                    }
                    type={f.type}
                    required={f.key !== "phone"}
                    step={
                      f.key === "marks" || f.key === "maxMarks"
                        ? "any"
                        : undefined
                    }
                    {...register(f.key)}
                  />
                )}{" "}
                {errors[f.key] && (
                  <small
                    id={formId + f.key + "-error"}
                    className="field-error"
                    role="alert"
                  >
                    {errors[f.key].message}
                  </small>
                )}
              </div>
            </React.Fragment>
          ))}
          {kind === "grades" && (
            <div className="assessment-preview" aria-live="polite">
              <strong>
                {marks !== "" &&
                maximum !== "" &&
                Number.isFinite(Number(marks)) &&
                Number(maximum) > 0 &&
                Number(marks) >= 0 &&
                Number(marks) <= Number(maximum)
                  ? ((Number(marks) / Number(maximum)) * 100).toFixed(1) + "%"
                  : "—"}
              </strong>
              <span>
                Assessment percentage · recorded marks / maximum marks
              </span>
            </div>
          )}
          {relationKind && entities.student && entities.course && (
            <div
              className={
                "compatibility" + (mismatches.length ? " has-mismatch" : "")
              }
              role="status"
            >
              <strong>
                {mismatches.length
                  ? "Check academic compatibility"
                  : "Academic context matches"}
              </strong>
              {mismatches.length ? (
                <ul>
                  {mismatches.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  The API will verify enrollment and academic rules when you
                  save.
                </p>
              )}
            </div>
          )}
        </fieldset>
        {relationKind && (
          <p className="info-note">
            Student and course must share department, semester, and academic
            year. Term must match the course academic year.
          </p>
        )}
        {mutation.error && <Message error>{mutation.error.message}</Message>}
        <div className="dialog-actions">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function Records({ kind }) {
  const location = useLocation(),
    navigate = useNavigate();
  const readFilters = () =>
    Object.fromEntries(
      [...new URLSearchParams(location.search)].filter(([key]) =>
        [
          "department",
          "academicYear",
          "status",
          "semester",
          "student",
          "course",
          "date",
          "term",
        ].includes(key),
      ),
    );
  const config = modules[kind],
    qc = useQueryClient(),
    [search, setSearch] = useState(
      () => new URLSearchParams(location.search).get("search") || "",
    ),
    [filters, setFilters] = useState(readFilters),
    [page, setPage] = useState(1),
    [sort, setSort] = useState(
      kind === "students"
        ? "studentId"
        : kind === "courses"
          ? "code"
          : "createdAt",
    ),
    [order, setOrder] = useState("asc"),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("list");
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const incoming = new URLSearchParams(location.search);
    setSearch(incoming.get("search") || "");
    setFilters(readFilters());
    setPage(1);
    if (incoming.get("action") === "new") {
      setEditing({});
      incoming.delete("action");
      navigate(
        { pathname: location.pathname, search: incoming.toString() },
        { replace: true },
      );
    }
  }, [location.search]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const params = new URLSearchParams({
    search: debounced,
    page,
    limit: 12,
    sort,
    order,
    ...filters,
  });
  const capabilities = useQuery({
    queryKey: ["operation-capabilities"],
    queryFn: () => api("/operations/capabilities"),
    staleTime: 300000,
    enabled: ["students", "attendance"].includes(kind),
  });
  const q = useData([kind, params.toString()], "/" + kind + "?" + params);
  const del = useMutation({
    mutationFn: (id) => api("/" + kind + "/" + id, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries();
      setDeleting(null);
      setPage(1);
      setNotice("Record removed.");
    },
  });
  const change = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };
  return (
    <>
      <Heading
        title={config.title}
        description={config.description}
        action={
          <div className="page-actions">
            {capabilities.data?.atomicBatches && kind === "students" && (
              <Link className="secondary-action" to="/students/import">
                Import CSV
              </Link>
            )}
            {capabilities.data?.atomicBatches && kind === "attendance" && (
              <Link className="secondary-action" to="/attendance/register">
                Open register
              </Link>
            )}
            <button
              className="primary"
              onClick={() => {
                setEditing({});
                setNotice("");
              }}
            >
              <Plus size={17} />
              Add {config.singular}
            </button>
          </div>
        }
      />
      {notice && <Message>{notice}</Message>}
      <section className="panel records">
        <div className="toolbar">
          {kind === "courses" && (
            <div
              role="group"
              aria-label="Course layout"
              className="view-toggle"
            >
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                List
              </button>
              <button
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                Cards
              </button>
            </div>
          )}
          {["students", "courses"].includes(kind) && (
            <div className="search">
              <Search size={17} />
              <input
                aria-label="Search records"
                placeholder={
                  kind === "students"
                    ? "Search name, ID, or email…"
                    : "Search courses…"
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
          {["students", "courses"].includes(kind) && (
            <>
              <input
                aria-label="Filter by department"
                placeholder="Department"
                value={filters.department || ""}
                onChange={(e) => change("department", e.target.value)}
              />
              <input
                aria-label="Filter by academic year"
                placeholder="Academic year"
                value={filters.academicYear || ""}
                onChange={(e) => change("academicYear", e.target.value)}
              />
            </>
          )}
          {["students", "courses"].includes(kind) && (
            <select
              aria-label="Filter by semester"
              value={filters.semester || ""}
              onChange={(e) => change("semester", e.target.value)}
            >
              <option value="">All semesters</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Semester {i + 1}
                </option>
              ))}
            </select>
          )}
          {["enrollments", "attendance"].includes(kind) && (
            <select
              aria-label="Filter by status"
              value={filters.status || ""}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {(kind === "attendance"
                ? ["present", "absent", "late"]
                : ["active", "completed", "withdrawn"]
              ).map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          )}
          {kind === "students" && (
            <select
              aria-label="Filter by status"
              value={filters.status || ""}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {["active", "inactive", "graduated"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {["enrollments", "attendance", "grades"].includes(kind) && (
            <CoursePicker
              label="Filter by course"
              value={filters.course || ""}
              summary={false}
              onChange={(id) => change("course", id)}
            />
          )}
          {["enrollments", "grades"].includes(kind) && (
            <input
              aria-label="Filter by academic term"
              placeholder="Academic term"
              value={filters.term || ""}
              onChange={(e) => change("term", e.target.value)}
            />
          )}
          {kind === "attendance" && (
            <input
              aria-label="Filter by date"
              type="date"
              value={filters.date || ""}
              onChange={(e) => change("date", e.target.value)}
            />
          )}
          {(search || Object.values(filters).some(Boolean)) && (
            <button
              onClick={() => {
                setSearch("");
                setDebounced("");
                setFilters({});
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
          <select
            aria-label="Sort records"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            {[
              "createdAt",
              ...(kind === "students"
                ? ["studentId", "firstName", "department"]
                : kind === "courses"
                  ? ["code", "name", "department"]
                  : kind === "attendance"
                    ? ["date"]
                    : []),
            ].map((key) => (
              <option key={key} value={key}>
                Sort: {label(key)}
              </option>
            ))}
          </select>
          <button
            aria-label="Toggle sort order"
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
          >
            {order === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
        {(search || Object.values(filters).some(Boolean)) && (
          <div className="applied-chips" aria-label="Active directory filters">
            {Object.entries({ ...filters, ...(search ? { search } : {}) })
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <span className="filter-chip" key={key}>
                  {label(key)}: {value}
                </span>
              ))}
          </div>
        )}
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <div className="list-error">
            <Message error>{q.error.message}</Message>
            <button onClick={() => q.refetch()}>Try again</button>
          </div>
        ) : q.data.items.length ? (
          <>
            {kind === "courses" && view === "cards" && (
              <div className="course-card-grid">
                {q.data.items.map((c) => (
                  <article className="course-card" key={c._id}>
                    <ModuleIcon kind="courses" size={30} />
                    <span className="badge">{c.code}</span>
                    <h2>
                      <Link to={"/courses/" + c._id}>{c.name}</Link>
                    </h2>
                    <dl>
                      {[
                        ["Department", c.department],
                        ["Semester", c.semester],
                        ["Credits", c.credits],
                        ["Faculty", c.facultyName],
                        ["Academic year", c.academicYear],
                      ].map(([name, value]) => (
                        <div key={name}>
                          <dt>{name}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="row-actions">
                      <button onClick={() => setEditing(c)}>Edit course</button>
                      <button className="danger" onClick={() => setDeleting(c)}>
                        Delete course
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div
              className="table-scroll directory-table responsive-directory"
              hidden={kind === "courses" && view === "cards"}
            >
              <table>
                <thead>
                  <tr>
                    {config.columns.map((key) => (
                      <th key={key}>{label(key)}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row) => (
                    <tr key={row._id}>
                      {config.columns.map((key) => (
                        <td key={key}>
                          {key === "status" ? (
                            <span className={"badge " + row[key]}>
                              {label(row[key])}
                            </span>
                          ) : kind === "students" && key === "fullName" ? (
                            <Link
                              className="student-name"
                              to={"/students/" + row._id}
                            >
                              <span
                                className="student-avatar"
                                aria-hidden="true"
                              >
                                {row.firstName[0]}
                                {row.lastName[0]}
                              </span>
                              {display(row, key)}
                            </Link>
                          ) : kind === "courses" && key === "code" ? (
                            <Link
                              className="course-code"
                              to={"/courses/" + row._id}
                            >
                              {row.code}
                            </Link>
                          ) : (
                            display(row, key)
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={"Edit " + config.singular}
                            onClick={() => {
                              setEditing(row);
                              setNotice("");
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={"Delete " + config.singular}
                            onClick={() => {
                              del.reset();
                              setDeleting(row);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="mobile-records"
              hidden={kind === "courses" && view === "cards"}
            >
              {q.data.items.map((row) => (
                <MobileRecord
                  key={row._id}
                  kind={kind}
                  row={row}
                  onEdit={() => {
                    setEditing(row);
                    setNotice("");
                  }}
                  onDelete={() => {
                    del.reset();
                    setDeleting(row);
                  }}
                />
              ))}
            </div>
            <div className="pagination">
              <span>
                {q.data.total} records · Page {page} of{" "}
                {Math.max(1, q.data.pages)}
              </span>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next page"
                  disabled={page >= q.data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            kind={
              search || Object.values(filters).some(Boolean) ? "search" : kind
            }
            text={
              search || Object.values(filters).some(Boolean)
                ? "No records match these filters. Try a different search or clear the filters."
                : "Add your first " +
                  config.singular +
                  " to begin building your academic workspace."
            }
          />
        )}
      </section>
      {editing && (
        <RecordForm
          kind={kind}
          record={editing._id ? editing : null}
          onClose={(message) => {
            setEditing(null);
            if (message) setNotice(message);
          }}
        />
      )}
      {deleting && (
        <Modal
          title={"Delete " + config.singular + "?"}
          busy={del.isPending}
          onClose={() => {
            if (!del.isPending) setDeleting(null);
          }}
        >
          <p className="dialog-copy">
            This permanently removes the selected record. Records with dependent
            academic data cannot be removed.
          </p>
          {del.error && <Message error>{del.error.message}</Message>}
          <div className="dialog-actions">
            <button disabled={del.isPending} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="danger-button"
              disabled={del.isPending}
              onClick={() => del.mutate(deleting._id)}
            >
              {del.isPending ? "Deleting…" : "Confirm deletion"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
