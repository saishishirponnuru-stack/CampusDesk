import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { label } from "../config";
import { Empty } from "./Feedback";
export const useData = (key, path) =>
  useQuery({ queryKey: key, queryFn: ({ signal }) => api(path, { signal }) });
export function Heading({ title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">CAMPUSDESK / WORKSPACE</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export const display = (row, key) => {
  if (key === "fullName") return row.firstName + " " + row.lastName;
  if (key === "student")
    return row.student
      ? row.student.firstName + " " + row.student.lastName
      : "Unavailable";
  if (key === "course")
    return typeof row.course === "string"
      ? row.course
      : row.course?.name || "Unavailable";
  if (key === "percentage") return Number(row.percentage).toFixed(1) + "%";
  return String(row[key] ?? "—");
};
export function SimpleTable({ rows, columns }) {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{label(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || i}>
              {columns.map((c) => (
                <td key={c}>
                  {c === "course" && typeof r.course === "object"
                    ? r.course.name
                    : display(r, c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text="No recorded data for this report." />
  );
}
