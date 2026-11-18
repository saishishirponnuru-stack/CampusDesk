import React, { useEffect, useId, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search, Check, X, ChevronDown } from "lucide-react";
import { api } from "../api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { ModuleIcon } from "./ModuleIcon";
export const entityName = (kind, entity) =>
  kind === "students"
    ? [entity.firstName, entity.lastName].filter(Boolean).join(" ") ||
      entity.studentId ||
      "Selected student"
    : entity.name || entity.code || "Selected course";
export function SelectedEntitySummary({ kind, entity }) {
  if (!entity) return null;
  return (
    <div className="selected-entity">
      <ModuleIcon kind={kind} size={24} />
      <div>
        <strong>{entityName(kind, entity)}</strong>
        <small>
          {[
            kind === "students"
              ? entity.rollNumber || entity.studentId
              : entity.code,
            entity.department,
            entity.semester ? `Semester ${entity.semester}` : null,
            kind === "students"
              ? entity.section
                ? `Section ${entity.section}`
                : null
              : entity.academicYear,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </div>
      <Check size={16} aria-hidden="true" />
    </div>
  );
}
export function EntityCombobox({
  kind,
  value = "",
  onChange,
  initialEntity,
  id: suppliedId,
  label,
  disabled = false,
  invalid = false,
  describedBy,
  required = false,
  summary = true,
}) {
  const generated = useId(),
    id = suppliedId || generated,
    listId = id + "-results";
  const root = useRef(null),
    input = useRef(null);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(-1),
    [chosen, setChosen] = useState(null);
  const term = useDebouncedValue(search.trim());
  const selected =
    chosen?._id === value
      ? chosen
      : initialEntity?._id === value
        ? initialEntity
        : null;
  const detail = useQuery({
    queryKey: ["entity-detail", kind, value],
    queryFn: ({ signal }) => api(`/${kind}/${value}`, { signal }),
    enabled: !!value && !selected,
    staleTime: 60000,
    retry: 1,
  });
  const entity = selected || (detail.data?._id === value ? detail.data : null);
  const results = useInfiniteQuery({
    queryKey: ["entity-picker", kind, term],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api(
        `/${kind}?limit=20&page=${pageParam}&sort=${kind === "students" ? "studentId" : "code"}&order=asc&search=${encodeURIComponent(term)}`,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page < last.pages ? last.page + 1 : undefined,
    getPreviousPageParam: (first) =>
      first.page > 1 ? first.page - 1 : undefined,
    maxPages: 5,
    enabled: open,
    staleTime: 30000,
    retry: false,
  });
  const items = Array.from(
    new Map(
      (results.data?.pages || [])
        .flatMap((p) => p.items || [])
        .map((item) => [item._id, item]),
    ).values(),
  );
  const waiting = search.trim() !== term;
  useEffect(() => {
    setActive(-1);
  }, [term]);
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, listId]);
  useEffect(() => {
    const outside = (e) => {
      if (!root.current?.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const pick = (item) => {
    setChosen(item);
    onChange(item._id, item);
    setOpen(false);
    setSearch("");
    setActive(-1);
    input.current?.focus();
    setOpen(false);
  };
  return (
    <div
      className="entity-picker"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          input.current?.focus();
          setOpen(false);
          setSearch("");
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setSearch("");
        }
      }}
    >
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}
      <div className="entity-input">
        <Search size={17} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && !waiting && items[active]
              ? `${listId}-${active}`
              : undefined
          }
          aria-invalid={invalid || !!detail.error}
          aria-describedby={describedBy}
          autoComplete="off"
          maxLength={120}
          disabled={disabled}
          placeholder={
            entity
              ? entityName(kind, entity)
              : `Search ${kind === "students" ? "student name or ID" : "course name or code"}…`
          }
          value={search}
          onClick={() => setOpen(true)}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setSearch("");
              return;
            }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              setOpen(true);
              if (!waiting && items.length)
                setActive((i) =>
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? items.length - 1
                      : e.key === "ArrowDown"
                        ? Math.min(i + 1, items.length - 1)
                        : i < 0
                          ? items.length - 1
                          : Math.max(i - 1, 0),
                );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (!waiting && items[active]) pick(items[active]);
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="icon-button"
            disabled={disabled}
            aria-label={`Clear ${label || kind}`}
            onClick={() => {
              setChosen(null);
              setSearch("");
              onChange("", null);
              input.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        ) : (
          <ChevronDown size={15} aria-hidden="true" />
        )}
      </div>
      {summary && value && entity && (
        <SelectedEntitySummary kind={kind} entity={entity} />
      )}
      {value && detail.isFetching && !entity && (
        <small role="status">Loading selected record…</small>
      )}
      {detail.error && !entity && (
        <div className="picker-error" role="alert">
          Selected record is unavailable. Choose it again or clear it.
          <button type="button" onClick={() => detail.refetch()}>
            Retry selected record
          </button>
        </div>
      )}
      {open && !disabled && (
        <div className="entity-popover">
          <div className="picker-caption">
            {kind === "students" ? "STUDENT DIRECTORY" : "COURSE DIRECTORY"}
            <span>
              {waiting || results.isFetching
                ? "Searching…"
                : `${results.data?.pages[0]?.total ?? items.length} matches`}
            </span>
          </div>
          <div
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={`${label || kind} results`}
            aria-busy={waiting || results.isFetching}
            className="entity-results"
          >
            {!waiting &&
              items.map((item, index) => (
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  id={`${listId}-${index}`}
                  key={item._id}
                  aria-selected={value === item._id}
                  data-active={active === index}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => pick(item)}
                >
                  <ModuleIcon kind={kind} size={22} />
                  <span>
                    <strong>{entityName(kind, item)}</strong>
                    <small>
                      {[
                        kind === "students"
                          ? item.rollNumber || item.studentId
                          : item.code,
                        item.department,
                        item.semester ? `Semester ${item.semester}` : null,
                        kind === "students"
                          ? item.section
                            ? `Section ${item.section}`
                            : null
                          : item.academicYear,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  {value === item._id && <Check size={16} />}
                </button>
              ))}
          </div>
          {(waiting || results.isPending) && (
            <p role="status">Searching records…</p>
          )}
          {!waiting &&
            !results.isPending &&
            !results.error &&
            !items.length && (
              <p role="status">
                No matching {kind}. Try a name, identifier or shorter search.
              </p>
            )}
          {results.error && (
            <div className="picker-error" role="alert">
              Could not load {kind}. Your selected record is preserved.
              <button
                type="button"
                onClick={() =>
                  results.isFetchNextPageError
                    ? results.fetchNextPage()
                    : results.refetch()
                }
              >
                Retry results
              </button>
            </div>
          )}
          {results.hasPreviousPage && (
            <button
              type="button"
              className="picker-more"
              aria-disabled={results.isFetching || waiting}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!results.isFetching && !waiting)
                  results.fetchPreviousPage();
              }}
            >
              Previous {kind}
            </button>
          )}
          {results.hasNextPage && (
            <button
              type="button"
              className="picker-more"
              aria-disabled={results.isFetching || waiting}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!results.isFetching && !waiting) results.fetchNextPage();
              }}
            >
              Load more {kind}
            </button>
          )}
          <small className="picker-hint">
            ↑ ↓ navigate · Enter select · Esc close
          </small>
        </div>
      )}
    </div>
  );
}
export const StudentPicker = (props) => (
  <EntityCombobox {...props} kind="students" />
);
export const CoursePicker = (props) => (
  <EntityCombobox {...props} kind="courses" />
);
