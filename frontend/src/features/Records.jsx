import React, { useState, useEffect, useId } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { AcademicIcon } from "../components/Brand";
export function RecordForm({ kind, record, onClose }) {
  const formId = useId();
  const config = modules[kind],
    qc = useQueryClient();
  const [relationSearch, setRelationSearch] = useState({
    student: "",
    course: "",
  });
  const relationKind = ["enrollments", "attendance", "grades"].includes(kind);
  const students = useQuery({
    queryKey: ["student-options", relationSearch.student],
    queryFn: () =>
      api(
        "/students?limit=100&search=" +
          encodeURIComponent(relationSearch.student),
      ),
    enabled: relationKind,
  });
  const courses = useQuery({
    queryKey: ["course-options", relationSearch.course],
    queryFn: () =>
      api(
        "/courses?limit=100&search=" +
          encodeURIComponent(relationSearch.course),
      ),
    enabled: relationKind,
  });
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
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({ defaultValues: defaults, resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (values) =>
      api("/" + kind + (record ? "/" + record._id : ""), {
        method: record ? "PUT" : "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose("Record saved successfully.");
    },
  });
  const close = () => {
    if (mutation.isPending) return;
    if (!isDirty || window.confirm("Discard your unsaved changes?")) onClose();
  };
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  return (
    <Modal
      title={(record ? "Edit " : "Add ") + config.singular}
      onClose={close}
      busy={mutation.isPending}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
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
                  <>
                    <input
                      aria-label={
                        "Search " + f.label.toLowerCase() + " options"
                      }
                      placeholder={"Search " + f.label.toLowerCase() + "…"}
                      value={relationSearch[f.type]}
                      onChange={(e) =>
                        setRelationSearch({
                          ...relationSearch,
                          [f.type]: e.target.value,
                        })
                      }
                    />
                    <select
                      id={formId + f.key}
                      aria-invalid={!!errors[f.key]}
                      aria-describedby={
                        errors[f.key] ? formId + f.key + "-error" : undefined
                      }
                      required
                      {...register(f.key)}
                    >
                      <option value="">Select {f.label.toLowerCase()}</option>
                      {record?.[f.key]?._id &&
                        !(
                          f.type === "student" ? students : courses
                        ).data?.items.some(
                          (o) => o._id === record[f.key]._id,
                        ) && (
                          <option value={record[f.key]._id}>
                            {record[f.key].studentId || record[f.key].code}
                          </option>
                        )}
                      {(f.type === "student"
                        ? students
                        : courses
                      ).data?.items.map((o) => (
                        <option value={o._id} key={o._id}>
                          {f.type === "student"
                            ? o.studentId +
                              " · " +
                              o.firstName +
                              " " +
                              o.lastName
                            : o.code + " · " + o.name}
                        </option>
                      ))}
                    </select>
                    {(f.type === "student" ? students : courses).error && (
                      <small className="field-error">
                        Unable to load options
                      </small>
                    )}
                    <small>Search to find records beyond the first 100.</small>
                  </>
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
    [notice, setNotice] = useState("");
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
  const [courseSearch, setCourseSearch] = useState("");
  const courseOptions = useQuery({
    queryKey: ["filter-courses", courseSearch],
    queryFn: () =>
      api("/courses?limit=100&search=" + encodeURIComponent(courseSearch)),
    enabled: ["enrollments", "attendance", "grades"].includes(kind),
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
        }
      />
      {notice && <Message>{notice}</Message>}
      <section className="panel records">
        <div className="toolbar">
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
            <>
              <input
                aria-label="Search course filter options"
                placeholder="Find a course…"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
              <select
                aria-label="Filter by course"
                value={filters.course || ""}
                onChange={(e) => change("course", e.target.value)}
              >
                <option value="">All courses</option>
                {courseOptions.data?.items.map((c) => (
                  <option value={c._id} key={c._id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </>
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
                setCourseSearch("");
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
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <div className="list-error">
            <Message error>{q.error.message}</Message>
            <button onClick={() => q.refetch()}>Try again</button>
          </div>
        ) : q.data.items.length ? (
          <>
            <div
              className={
                "table-scroll directory-table " +
                (["students", "courses"].includes(kind)
                  ? "responsive-directory"
                  : "")
              }
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
            {["students", "courses"].includes(kind) && (
              <div className="mobile-records">
                {q.data.items.map((row) => (
                  <article className="mobile-record" key={row._id}>
                    <div className="mobile-record-identity">
                      <span className="student-avatar" aria-hidden="true">
                        {kind === "students" ? (
                          row.firstName[0] + row.lastName[0]
                        ) : (
                          <AcademicIcon kind="courses" size={20} />
                        )}
                      </span>
                      <div>
                        <Link to={"/" + kind + "/" + row._id}>
                          <strong>
                            {kind === "students"
                              ? row.firstName + " " + row.lastName
                              : row.name}
                          </strong>
                        </Link>
                        <small>
                          {kind === "students" ? row.studentId : row.code}
                        </small>
                      </div>
                      {row.status && (
                        <span className={"badge " + row.status}>
                          {label(row.status)}
                        </span>
                      )}
                    </div>
                    <dl>
                      <div>
                        <dt>Department</dt>
                        <dd>{row.department}</dd>
                      </div>
                      <div>
                        <dt>Academic year</dt>
                        <dd>{row.academicYear}</dd>
                      </div>
                      <div>
                        <dt>Semester</dt>
                        <dd>{row.semester}</dd>
                      </div>
                      {kind === "courses" && (
                        <div>
                          <dt>Faculty</dt>
                          <dd>{row.facultyName}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mobile-record-actions">
                      <Link to={"/" + kind + "/" + row._id}>
                        View {config.singular} <ArrowUpRight size={13} />
                      </Link>
                      <button
                        aria-label={"Edit " + config.singular}
                        onClick={() => {
                          setEditing(row);
                          setNotice("");
                        }}
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button
                        className="danger icon-button"
                        aria-label={"Delete " + config.singular}
                        onClick={() => {
                          del.reset();
                          setDeleting(row);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
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
          onClose={() => setDeleting(null)}
        >
          <p className="dialog-copy">
            This permanently removes the selected record. Records with dependent
            academic data cannot be removed.
          </p>
          {del.error && <Message error>{del.error.message}</Message>}
          <div className="dialog-actions">
            <button onClick={() => setDeleting(null)}>Cancel</button>
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
