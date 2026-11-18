import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Download, Check } from "lucide-react";
import { api, downloadFile } from "../api";
import { Heading } from "../components/WorkspaceUI";
import { Message, Loading, Modal } from "../components/Feedback";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { FileDropzone } from "../components/FileDropzone";
const fields = [
  "studentId",
  "rollNumber",
  "firstName",
  "lastName",
  "email",
  "phone",
  "department",
  "academicYear",
  "semester",
  "batch",
  "section",
  "status",
];
const labels = {
  studentId: "Student ID",
  rollNumber: "Roll number",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  department: "Department",
  academicYear: "Academic year",
  semester: "Semester",
  batch: "Batch",
  section: "Section",
  status: "Status",
};
export default function StudentImport() {
  const qc = useQueryClient(),
    generation = useRef(0),
    [csv, setCSV] = useState(""),
    [fileName, setFileName] = useState(""),
    [fileInfo, setFileInfo] = useState(null),
    [reading, setReading] = useState(false),
    [mapping, setMapping] = useState({}),
    [ignored, setIgnored] = useState([]),
    [preview, setPreview] = useState(null),
    [stale, setStale] = useState(false),
    [error, setError] = useState(""),
    [review, setReview] = useState(false),
    [result, setResult] = useState(null),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [page, setPage] = useState(1);
  const caps = useQuery({
    queryKey: ["operation-capabilities"],
    queryFn: () => api("/operations/capabilities"),
    staleTime: 300000,
  });
  useUnsavedChanges(!!csv && !result);
  const validate = useMutation({
    mutationFn: (payload) =>
      api("/students/import/preview", {
        method: "POST",
        body: JSON.stringify({
          csv: payload.csv,
          mapping: payload.mapping,
          ignoredColumns: payload.ignoredColumns,
        }),
      }),
    onSuccess: (data, variables) => {
      if (variables.generation !== generation.current) return;
      setError("");
      setPreview(data);
      setMapping(data.mapping);
      setIgnored(data.ignoredColumns);
      setStale(false);
      setPage(1);
    },
    onError: (err, variables) => {
      if (variables.generation === generation.current) setError(err.message);
    },
  });
  const save = useMutation({
    mutationFn: () =>
      api("/students/import", {
        method: "POST",
        body: JSON.stringify({
          csv,
          mapping,
          ignoredColumns: ignored,
          previewDigest: preview.digest,
          requestId,
          confirm: true,
        }),
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries();
      setResult(data);
      setReview(false);
    },
  });
  const reset = () => {
    generation.current++;
    setError("");
    setPreview(null);
    setResult(null);
    setCSV("");
    setFileName("");
    setFileInfo(null);
    setReading(false);
    setStale(false);
    setMapping({});
    setIgnored([]);
    setReview(false);
    setRequestId(crypto.randomUUID());
    save.reset();
  };
  const choose = async (files) => {
    if (!files.length) return;
    if (files.length !== 1) {
      setError(
        "Choose one CSV at a time. Your current selection is unchanged.",
      );
      return;
    }
    if (
      csv &&
      !result &&
      !window.confirm("Replace your selected file and discard its preview?")
    )
      return;
    reset();
    const current = generation.current,
      file = files[0];
    setFileName(file.name);
    setFileInfo({ name: file.name, size: file.size });
    if (
      !file.name.toLowerCase().endsWith(".csv") ||
      (file.type &&
        ![
          "text/csv",
          "application/csv",
          "application/vnd.ms-excel",
          "text/plain",
        ].includes(file.type))
    ) {
      setError(
        "Choose a UTF-8 .csv file. Rename only if the file is actually CSV text.",
      );
      return;
    }
    if (file.size > 65536) {
      setError(
        "Choose a CSV no larger than 64 KiB (65,536 bytes). Split larger files into batches of up to 100 students.",
      );
      return;
    }
    if (!file.size) {
      setError(
        "This file is empty. Add the template headers and student rows, then replace it.",
      );
      return;
    }
    setReading(true);
    try {
      const value = await file.text();
      if (current !== generation.current) return;
      setReading(false);
      setCSV(value);
      validate.mutate({ csv: value, ignoredColumns: [], generation: current });
    } catch {
      if (current === generation.current) {
        setReading(false);
        setError("The file could not be read. Choose it again.");
      }
    }
  };
  const remove = () => {
    if (
      csv &&
      !result &&
      !window.confirm("Remove your selected file and discard its preview?")
    )
      return;
    reset();
  };
  const remap = (field, header) => {
    generation.current++;
    setMapping((previous) => ({ ...previous, [field]: header }));
    setStale(true);
    setResult(null);
    setRequestId(crypto.randomUUID());
    save.reset();
  };
  const toggleIgnored = (header, checked) => {
    generation.current++;
    setIgnored((previous) =>
      checked
        ? [...previous, header]
        : previous.filter((value) => value !== header),
    );
    setStale(true);
    setResult(null);
    setRequestId(crypto.randomUUID());
  };
  const ready =
    preview &&
    !stale &&
    !preview.errors.length &&
    !preview.summary.invalid &&
    preview.summary.total > 0 &&
    !error &&
    !reading &&
    !validate.isPending &&
    !result;
  return (
    <>
      <Link className="back" to="/students">
        <ChevronLeft size={16} />
        Student directory
      </Link>
      <Heading
        title="Import students"
        description="Review every row. Create records with confidence."
      />
      {caps.isPending ? (
        <Loading />
      ) : caps.error ? (
        <Message error>{caps.error.message}</Message>
      ) : !caps.data.atomicBatches ? (
        <Message error>
          Atomic imports require a replica-set database. Individual student
          creation remains available.
        </Message>
      ) : (
        <>
          <ol className="import-stepper" aria-label="Import progress">
            {[
              "Upload file",
              "Match columns",
              "Validate records",
              "Review changes",
              "Import complete",
            ].map((step, i) => {
              const stage = result
                ? 4
                : review
                  ? 3
                  : preview && !stale && !preview.errors.length
                    ? 2
                    : preview || stale
                      ? 1
                      : 0;
              return (
                <li
                  key={step}
                  aria-current={stage === i ? "step" : undefined}
                  data-complete={stage > i}
                >
                  <span>
                    {stage > i ? <Check size={15} aria-hidden="true" /> : i + 1}
                  </span>
                  <strong>{step}</strong>
                </li>
              );
            })}
          </ol>
          {!result && (
            <div className="import-intake">
              <FileDropzone
                file={fileInfo}
                busy={reading || validate.isPending || save.isPending}
                onSelect={choose}
                onRemove={remove}
                status={
                  reading
                    ? "Reading CSV on this device…"
                    : validate.isPending
                      ? "Validating records with the API…"
                      : error
                        ? "File needs attention. See the error below."
                        : stale
                          ? "Columns changed. Validate mapping to continue."
                          : preview
                            ? ready
                              ? `${preview.summary.valid} valid rows. Review the preview, then choose Review import.`
                              : "Validation needs attention. Check column mapping and row errors below."
                            : undefined
                }
              />
              <aside className="panel import-guide">
                <details open={!fileInfo}>
                  <summary>Template &amp; import guidance</summary>
                  <h2>Good records start here.</h2>
                  <p>One file. A clear preview. You decide when to save.</p>
                  <ol>
                    <li>
                      <strong>Use the official template</strong>
                      <span>
                        Keep the headings. Supply your own required student
                        values.
                      </span>
                    </li>
                    <li>
                      <strong>Check every row</strong>
                      <span>
                        Match columns and resolve errors before continuing.
                      </span>
                    </li>
                    <li>
                      <strong>Confirm with confidence</strong>
                      <span>
                        All rows save together. Existing students are never
                        overwritten; duplicates block the whole import.
                      </span>
                    </li>
                  </ol>
                  <button
                    onClick={() =>
                      downloadFile(
                        "/students/import/template.csv",
                        "campusdesk-students-template.csv",
                      ).catch((err) => setError(err.message))
                    }
                  >
                    <Download size={16} />
                    Download CSV template
                  </button>
                  <small>
                    File reading happens locally. Validation sends CSV content
                    to your configured API, without creating records.
                  </small>
                </details>
              </aside>
            </div>
          )}
          {error && <Message error>{error}</Message>}
          {csv && error && !validate.isPending && (
            <button
              onClick={() => {
                setError("");
                validate.mutate({
                  csv,
                  mapping: preview ? mapping : undefined,
                  ignoredColumns: ignored,
                  generation: generation.current,
                });
              }}
            >
              Retry validation
            </button>
          )}
          {preview && !result && (
            <>
              <details
                className="panel import-mapping"
                open={!!preview.errors.length || stale}
              >
                <summary className="panel-head">
                  <div>
                    <h2>Match your columns</h2>
                    <p>
                      Every required field needs a column. Any unused column
                      must be explicitly ignored.
                    </p>
                  </div>
                  <span aria-hidden="true">⌄</span>
                </summary>
                <div className="mapping-grid">
                  {fields.map((field) => (
                    <div className="mapping-field" key={field}>
                      <label htmlFor={"map-" + field}>
                        Map {labels[field]}
                        {field === "phone" ? " (optional)" : ""}
                      </label>
                      <select
                        id={"map-" + field}
                        value={mapping[field] || ""}
                        disabled={save.isPending || validate.isPending}
                        onChange={(event) => remap(field, event.target.value)}
                      >
                        <option value="">Not mapped</option>
                        {preview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {preview.headers
                  .filter((header) => !Object.values(mapping).includes(header))
                  .map((header) => (
                    <label className="ignore-column" key={header}>
                      <input
                        type="checkbox"
                        checked={ignored.includes(header)}
                        onChange={(event) =>
                          toggleIgnored(header, event.target.checked)
                        }
                      />
                      Ignore column “{header}”
                    </label>
                  ))}
                <div className="mapping-actions">
                  <button
                    disabled={validate.isPending || save.isPending}
                    onClick={() => {
                      setError("");
                      validate.mutate({
                        csv,
                        mapping,
                        ignoredColumns: ignored,
                        generation: generation.current,
                      });
                    }}
                  >
                    Validate mapping
                  </button>
                  <span>
                    {stale
                      ? "Mapping changed. Validate again to refresh the preview."
                      : "Column mapping validated against the server."}
                  </span>
                </div>
              </details>
              {!stale && (
                <section className="panel import-preview">
                  <div className="panel-head">
                    <div>
                      <h2>Import preview</h2>
                      <p>
                        Data row numbers exclude the header. Nothing has been
                        written yet.
                      </p>
                    </div>
                  </div>
                  <div className="import-summary">
                    {[
                      ["Total rows", preview.summary.total],
                      ["Valid rows", preview.summary.valid],
                      ["Invalid rows", preview.summary.invalid],
                      ["Duplicate rows", preview.summary.duplicates],
                    ].map(([name, value]) => (
                      <div key={name}>
                        <strong>{value}</strong>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                  {!!preview.errors.length && (
                    <Message error>
                      {preview.errors
                        .map((issue) => issue.field + ": " + issue.message)
                        .join("; ")}
                    </Message>
                  )}
                  <div className="import-rows">
                    {preview.rows
                      .slice((page - 1) * 10, page * 10)
                      .map((row) => (
                        <article
                          className={
                            "import-row " +
                            (row.errors.length ? "has-errors" : "")
                          }
                          key={row.row}
                        >
                          <div>
                            <span className="badge">Data row {row.row}</span>
                            <strong>
                              {row.data.firstName || "Missing first name"}{" "}
                              {row.data.lastName || ""}
                            </strong>
                            <span>
                              {row.data.studentId || "Missing student ID"}
                            </span>
                            <span>
                              {row.data.department || "Missing department"}
                            </span>
                          </div>
                          {row.errors.length ? (
                            <ul>
                              {row.errors.map((issue, index) => (
                                <li key={index}>
                                  {labels[issue.field] || issue.field}:{" "}
                                  {issue.message}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="valid-row">
                              <Check size={14} />
                              {preview.errors.length
                                ? "Resolve column mapping first"
                                : "Valid for creation"}
                            </span>
                          )}
                        </article>
                      ))}
                  </div>
                  <div className="pagination">
                    <span>
                      {preview.rows.length} data rows · Page {page} of{" "}
                      {Math.ceil(preview.rows.length / 10)}
                    </span>
                    <div>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous preview page
                      </button>
                      <button
                        disabled={page * 10 >= preview.rows.length}
                        onClick={() => setPage(page + 1)}
                      >
                        Next preview page
                      </button>
                    </div>
                  </div>
                </section>
              )}
              <div className="import-confirmbar">
                <p>
                  Atomic import: correct every error before saving. Retry the
                  same confirmation after a network failure; it will not create
                  duplicates.
                </p>
                <button
                  className="primary"
                  disabled={!ready || save.isPending || validate.isPending}
                  onClick={() => {
                    save.reset();
                    setReview(true);
                  }}
                >
                  Review import
                </button>
              </div>
            </>
          )}
          {result && (
            <section className="panel import-result" role="status">
              <Check size={30} />
              <h2>
                {result.replayed
                  ? "Import already processed"
                  : "Import complete"}
              </h2>
              <p>
                {result.replayed
                  ? "This confirmation was already processed. No additional records were created."
                  : `${result.created} students created together. Existing records were not changed.`}
              </p>
              <button onClick={reset}>Start another import</button>
              <Link className="primary" to="/students">
                View students
              </Link>
            </section>
          )}
          {review && (
            <Modal
              title="Confirm student import"
              busy={save.isPending}
              onClose={() => {
                if (!save.isPending) setReview(false);
              }}
            >
              <div className="dialog-copy">
                <p>
                  Create {preview.summary.valid} student records from “
                  {fileName}”? All records are validated again and committed
                  together. Existing records will never be overwritten.
                </p>
                {save.error && <Message error>{save.error.message}</Message>}
              </div>
              <div className="dialog-actions">
                <button
                  disabled={save.isPending}
                  onClick={() => setReview(false)}
                >
                  Back to preview
                </button>
                <button
                  className="primary"
                  disabled={save.isPending}
                  onClick={() => {
                    if (ready && !save.isPending && !validate.isPending)
                      save.mutate();
                  }}
                >
                  {save.isPending
                    ? "Importing…"
                    : `Import ${preview.summary.valid} students`}
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </>
  );
}
