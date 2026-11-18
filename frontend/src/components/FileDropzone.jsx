import React, { useRef, useState } from "react";
import { Check, FileText, X, RefreshCw } from "lucide-react";
import { ModuleIcon } from "./ModuleIcon";

// The input remains the keyboard/screen-reader alternative to native file drag.
export function FileDropzone({ file, busy, status, onSelect, onRemove }) {
  const input = useRef(null),
    depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const files = (event) =>
    Array.from(event.dataTransfer?.types || []).includes("Files");
  const leave = () => {
    depth.current = 0;
    setDragging(false);
  };
  return (
    <section
      className={
        "file-dropzone" +
        (dragging ? " is-dragging" : "") +
        (file ? " has-file" : "")
      }
      aria-label="Student CSV dropzone"
      aria-busy={busy}
      onDragEnter={(event) => {
        if (!files(event)) return;
        event.preventDefault();
        depth.current++;
        if (!busy) setDragging(true);
      }}
      onDragOver={(event) => {
        if (!files(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        if (!files(event)) return;
        if (--depth.current <= 0) leave();
      }}
      onDrop={(event) => {
        if (!files(event)) return;
        event.preventDefault();
        leave();
        if (!busy) onSelect(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        className="sr-only"
        id="student-csv-file"
        ref={input}
        type="file"
        accept=".csv,text/csv"
        aria-label="Choose CSV file"
        disabled={busy}
        onChange={(event) => {
          onSelect(Array.from(event.target.files));
          event.target.value = "";
        }}
      />
      <span className="upload-emblem">
        <ModuleIcon kind="import" size={40} />
      </span>
      <span className="eyebrow">
        {file ? "YOUR SELECTED FILE" : "STUDENT IMPORT / CSV"}
      </span>
      <h2>
        {dragging
          ? "Release to select your CSV"
          : file
            ? file.name
            : "Drop your student CSV here"}
      </h2>
      {file ? (
        <p className="file-meta">
          <FileText size={15} aria-hidden="true" /> CSV ·{" "}
          {new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 1,
          }).format(file.size / 1024)}{" "}
          KB{" "}
          <span>
            <Check size={14} aria-hidden="true" /> Selected
          </span>
        </p>
      ) : (
        <p>Bring your student records together, in one careful step.</p>
      )}
      <div className="upload-actions">
        <button
          className={file ? "" : "primary"}
          disabled={busy}
          onClick={() => input.current.click()}
        >
          {file ? <RefreshCw size={16} aria-hidden="true" /> : null}
          {file ? "Replace file" : "Browse files"}
        </button>
        {file && (
          <button disabled={busy} onClick={onRemove}>
            <X size={16} aria-hidden="true" />
            Remove file
          </button>
        )}
      </div>
      <small>
        CSV files only · Maximum 64 KB (65,536 bytes) · Up to 100 students
      </small>
      <p className="upload-status" role="status">
        {busy && <span className="spinner" />}
        {status ||
          "Choose a file to begin. Nothing is saved without your confirmation."}
      </p>
    </section>
  );
}
