import React from "react";
const colors = {
  dashboard: "iris",
  students: "cyan",
  courses: "iris",
  enrollments: "mint",
  attendance: "mint",
  grades: "amber",
  reports: "cyan",
  settings: "iris",
  import: "iris",
  export: "mint",
  search: "cyan",
};
const drawings = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="3" y="15" width="7" height="6" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
    </>
  ),
  students: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" />
    </>
  ),
  courses: (
    <>
      <path d="m12 6 9-3v15l-9 3-9-3V3l9 3v15M6 8l3 1M15 9l3-1" />
    </>
  ),
  enrollments: (
    <>
      <rect x="3" y="3" width="14" height="18" rx="3" />
      <path d="M7 8h6M7 12h3m4 5 3 3 5-7" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4M17 3v4M3 10h18m-13 5 3 3 5-5" />
    </>
  ),
  grades: (
    <>
      <path d="m12 3 10 5-10 5L2 8l10-5ZM6 11v6q6 5 12 0v-6M22 8v9" />
    </>
  ),
  reports: (
    <>
      <path d="M3 21h18M5 17v-7h3v7m3 0V5h3v12m3 0V2h3v15" />
    </>
  ),
  settings: (
    <>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </>
  ),
  import: (
    <>
      <path d="M5 8V4a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3M14 2v5h5M2 12h11m-4-4 4 4-4 4" />
    </>
  ),
  export: (
    <>
      <path d="M5 8V4h10l4 4v12H5v-4M2 12h11m-7-4-4 4 4 4" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
};
export function ModuleIcon({ kind = "dashboard", size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
      className={
        "module-icon tone-" +
        (colors[kind] || "iris") +
        " " +
        (props.className || "")
      }
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="7"
        fill="currentColor"
        fillOpacity=".1"
        stroke="none"
      />
      {drawings[kind] || drawings.dashboard}
    </svg>
  );
}
