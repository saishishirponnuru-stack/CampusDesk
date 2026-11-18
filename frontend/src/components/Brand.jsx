import React from "react";

// Original Nova mark: an open C courtyard crossed by a connecting record rail.
export function BrandMark({ size = 32, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect
        width="40"
        height="40"
        rx="12"
        fill="currentColor"
        fillOpacity=".12"
      />
      <path
        d="M29 11H18a9 9 0 0 0 0 18h11"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M20 20h11"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="31" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      <span className="brand-text">
        CampusDesk<span className="brand-edition">nova</span>
      </span>
    </span>
  );
}
export { ModuleIcon as AcademicIcon } from "./ModuleIcon";
export function Illustration({ kind = "records", className = "" }) {
  const chart = ["reports", "dashboard"].includes(kind);
  return (
    <svg
      className={"editorial-art " + className}
      viewBox="0 0 240 160"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 125h176M46 139h148"
        stroke="currentColor"
        opacity=".12"
        strokeLinecap="round"
      />
      <rect
        x="48"
        y="35"
        width="126"
        height="92"
        rx="12"
        fill="var(--accent-soft)"
        stroke="var(--border)"
        transform="rotate(-7 48 35)"
      />
      <rect
        x="66"
        y="24"
        width="126"
        height="104"
        rx="12"
        fill="var(--surface)"
        stroke="var(--border)"
      />
      <path
        d="M82 43h51M82 52h30"
        stroke="var(--muted)"
        opacity=".5"
        strokeLinecap="round"
        strokeWidth="4"
      />
      {chart ? (
        <>
          <path
            d="M85 108V91h15v17M112 108V79h15v29M139 108V66h15v42"
            fill="var(--accent)"
            opacity=".45"
          />
          <path
            d="m84 84 28-14 25 4 28-21"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="81"
            y="69"
            width="25"
            height="25"
            rx="8"
            fill="var(--accent-soft)"
          />
          <path
            d="M118 75h54M118 86h38M81 109h91"
            stroke="var(--muted)"
            opacity=".35"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {kind === "courses" ? (
            <path d="m86 75 8 3 7-3v12l-7 3-8-3z" stroke="var(--accent)" />
          ) : (
            <circle cx="94" cy="78" r="4" fill="var(--accent)" />
          )}
        </>
      )}
      <circle
        cx="188"
        cy="116"
        r="19"
        fill="var(--mint-soft)"
        stroke="var(--surface)"
        strokeWidth="4"
      />
      {kind === "search" ? (
        <path
          d="m193 121-5-5m1-4a6 6 0 1 1-12 0 6 6 0 0 1 12 0"
          stroke="var(--mint)"
          strokeWidth="2"
        />
      ) : (
        <path
          d="m180 116 5 5 10-11"
          stroke="var(--mint)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
export function CampusIllustration() {
  return (
    <svg
      className="campus-art"
      viewBox="0 0 520 350"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="260"
        cy="295"
        rx="208"
        ry="35"
        fill="currentColor"
        opacity=".06"
      />
      <path
        d="m56 250 202-100 202 100-202 92z"
        fill="currentColor"
        opacity=".07"
      />
      <g stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5">
        <path d="M92 208v-69l92-44 82 39v68l-91 47zM266 202l91-44 82 39v68l-91 43-82-39zM184 95V43l80-38 88 42v109l-86 46" />
        <path d="m184 43 82 39 86-35M266 82v120M92 139l83 39 91-44M175 178v71M266 202l82 40 91-45M348 242v66" />
      </g>
      <path d="m184 43 82 39 86-35-88-42z" fill="var(--accent)" opacity=".3" />
      <path d="M266 82v120l86-46V47z" fill="var(--accent)" opacity=".12" />
      <path
        d="m92 139 83 39 91-44-82-39zM266 202l82 40 91-45-82-39z"
        fill="currentColor"
        opacity=".1"
      />
      <g stroke="var(--mint)" strokeWidth="2" strokeLinecap="round">
        <path d="m63 230 66 32 46-22M350 108l67 33v30M266 23V0" />
        <circle cx="63" cy="230" r="4" fill="var(--mint)" />
        <circle cx="417" cy="171" r="4" fill="var(--mint)" />
      </g>
      <g fill="currentColor" opacity=".45">
        <path d="m207 72 10 5v14l-10-5zM229 83l10 5v14l-10-5zM207 102l10 5v14l-10-5zM229 113l10 5v14l-10-5zM117 163l10 5v14l-10-5zM139 174l10 5v14l-10-5zM288 226l10 5v14l-10-5zM310 237l10 5v14l-10-5z" />
      </g>
      <rect
        x="35"
        y="77"
        width="143"
        height="51"
        rx="14"
        fill="var(--brand-surface)"
        stroke="currentColor"
        strokeOpacity=".25"
      />
      <circle cx="59" cy="102" r="10" fill="var(--mint)" fillOpacity=".22" />
      <path d="m55 102 3 3 6-7" stroke="var(--mint)" strokeWidth="2" />
      <path
        d="M80 97h74M80 107h47"
        stroke="currentColor"
        strokeOpacity=".5"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="346"
        y="252"
        width="140"
        height="51"
        rx="14"
        fill="var(--brand-surface)"
        stroke="currentColor"
        strokeOpacity=".25"
      />
      <path
        d="M366 284v-9M377 284v-18M388 284v-13"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M405 271h60M405 282h38"
        stroke="currentColor"
        strokeOpacity=".5"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
