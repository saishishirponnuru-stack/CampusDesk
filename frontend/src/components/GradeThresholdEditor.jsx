import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowDownWideNarrow } from "lucide-react";
import { api } from "../api";
import { Message } from "./Feedback";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
export function thresholdErrors(rows) {
  const errors = [];
  const labels = rows.map((r) => r.label.trim()),
    values = rows.map((r) => (r.minimum === "" ? NaN : Number(r.minimum)));
  if (rows.length < 2 || rows.length > 10)
    errors.push("Use between 2 and 10 grade boundaries.");
  if (labels.some((l) => !l || l.length > 120))
    errors.push("Every grade needs a label of 1–120 characters.");
  if (new Set(labels).size !== labels.length)
    errors.push("Grade labels must be unique.");
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100))
    errors.push("Minimum percentages must be between 0 and 100.");
  if (new Set(values).size !== values.length)
    errors.push("Minimum percentages must be unique.");
  if (!values.includes(0))
    errors.push("Include a zero boundary so every score has a grade.");
  return errors;
}
export function GradeThresholdEditor({ thresholds }) {
  const [rows, setRows] = useState(() => thresholds.map((r) => ({ ...r }))),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false),
    [example, setExample] = useState("85");
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!dirtyRef.current) setRows(thresholds.map((r) => ({ ...r })));
  }, [thresholds]);
  useUnsavedChanges(dirty);
  const qc = useQueryClient();
  const errors = thresholdErrors(rows),
    sorted = [...rows].sort((a, b) => Number(b.minimum) - Number(a.minimum));
  const save = useMutation({
    mutationFn: () =>
      api("/auth/thresholds", {
        method: "PUT",
        body: JSON.stringify({
          thresholds: sorted.map((r) => ({
            label: r.label.trim(),
            minimum: Number(r.minimum),
          })),
        }),
      }),
    onSuccess: async (data) => {
      dirtyRef.current = false;
      setDirty(false);
      setRows(data.thresholds);
      setSaved(true);
      await qc.invalidateQueries();
    },
  });
  const update = (next) => {
    setRows(next);
    setDirty(true);
    setSaved(false);
    save.reset();
  };
  const score = example === "" ? NaN : Number(example),
    grade =
      Number.isFinite(score) && score >= 0 && score <= 100 && !errors.length
        ? sorted.find((r) => score >= Number(r.minimum))?.label
        : null;
  return (
    <section className="panel setting threshold-editor">
      <span className="eyebrow">ACADEMIC PREFERENCES</span>
      <h2>Grade thresholds</h2>
      <p>
        Define the minimum percentage for each grade. The highest qualifying
        boundary wins.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!errors.length && dirty && !save.isPending) save.mutate();
        }}
        aria-busy={save.isPending}
      >
        <fieldset disabled={save.isPending}>
          <legend className="sr-only">Grading boundaries</legend>
          {rows.map((row, i) => (
            <div className="threshold-row" key={i}>
              <label>
                Grade label {i + 1}
                <input
                  value={row.label}
                  maxLength={120}
                  required
                  onChange={(e) =>
                    update(
                      rows.map((r, j) =>
                        j === i ? { ...r, label: e.target.value } : r,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Minimum percentage {i + 1}
                <span className="percentage-input">
                  <input
                    aria-label={`Minimum percentage ${i + 1}`}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                    value={row.minimum}
                    onChange={(e) =>
                      update(
                        rows.map((r, j) =>
                          j === i ? { ...r, minimum: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <span aria-hidden="true">%</span>
                </span>
              </label>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`Remove boundary ${i + 1}`}
                disabled={rows.length <= 2}
                onClick={() => update(rows.filter((_, j) => j !== i))}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
          <div className="threshold-actions">
            <button
              type="button"
              disabled={rows.length >= 10}
              onClick={() => update([...rows, { label: "", minimum: "" }])}
            >
              <Plus size={16} />
              Add grade
            </button>
            <button type="button" onClick={() => update(sorted)}>
              <ArrowDownWideNarrow size={16} />
              Sort boundaries
            </button>
          </div>
        </fieldset>
        {!!errors.length && (
          <div className="message error" role="alert">
            <ul>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {!errors.length && (
          <div className="grade-bands" aria-label="Grade band preview">
            {sorted.map((row, i) => (
              <div key={i}>
                <strong>{row.label}</strong>
                <span>
                  {row.minimum}%{" "}
                  {i === 0
                    ? "through 100%"
                    : `to below ${sorted[i - 1].minimum}%`}
                </span>
              </div>
            ))}
          </div>
        )}
        <label className="grade-example">
          Try a score (preview only)
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            value={example}
            onChange={(e) => setExample(e.target.value)}
          />
          <span aria-live="polite">
            {grade
              ? `${score}% → ${grade}`
              : "Enter a score from 0 to 100 with valid boundaries."}
          </span>
        </label>
        {dirty && (
          <p className="info-note">
            Unsaved changes. Saving updates grade labels calculated for existing
            and future assessments; recorded marks stay unchanged.
          </p>
        )}
        {save.error && (
          <Message error>
            {save.error.message} Your changes are retained. Try saving again.
          </Message>
        )}
        {saved && <Message>Grade thresholds saved.</Message>}
        <div className="threshold-actions">
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => {
              if (window.confirm("Discard unsaved grading changes?")) {
                setRows(thresholds.map((r) => ({ ...r })));
                setDirty(false);
                setSaved(false);
                save.reset();
              }
            }}
          >
            Discard changes
          </button>
          <button
            className="primary"
            disabled={!dirty || !!errors.length || save.isPending}
          >
            {save.isPending ? "Saving thresholds…" : "Save thresholds"}
          </button>
        </div>
      </form>
    </section>
  );
}
