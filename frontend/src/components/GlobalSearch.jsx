import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../api";
import { Modal, Loading, Message } from "./Feedback";

const pages = [
  "Students",
  "Courses",
  "Enrollments",
  "Attendance",
  "Grades",
  "Reports",
  "Settings",
];
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const shortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <>
      <button
        className="search-trigger"
        aria-label="Search workspace"
        onClick={() => setOpen(true)}
      >
        <Search size={16} />
        <span>Search</span>
        <kbd>⌘/Ctrl K</kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}
function SearchDialog({ onClose }) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const results = useQuery({
    queryKey: ["global-search", term],
    queryFn: async () => {
      const query = "?limit=6&search=" + encodeURIComponent(term);
      const [students, courses] = await Promise.all([
        api("/students" + query),
        api("/courses" + query),
      ]);
      return { students: students.items, courses: courses.items };
    },
    enabled: term.length >= 2,
  });
  return (
    <Modal title="Search workspace" onClose={onClose}>
      <div className="command-content">
        <label>
          Search students, courses, or pages
          <input
            autoFocus
            value={search}
            maxLength={120}
            placeholder="Enter a name, student ID, or course code…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <p className="command-hint">
          Type at least two characters to search records. Up to six results per
          category.
        </p>
        <nav aria-label="Page shortcuts">
          {["Dashboard", ...pages]
            .filter((name) =>
              name.toLowerCase().includes(search.trim().toLowerCase()),
            )
            .map((name) => (
              <Link
                onClick={onClose}
                key={name}
                to={name === "Dashboard" ? "/" : "/" + name.toLowerCase()}
              >
                {name}
              </Link>
            ))}
        </nav>
        {term.length >= 2 &&
          (results.isPending ? (
            <Loading />
          ) : results.error ? (
            <Message error>{results.error.message}</Message>
          ) : (
            <div aria-live="polite">
              <h3>Students</h3>
              {results.data.students.map((s) => (
                <Link
                  className="command-result"
                  onClick={onClose}
                  key={s._id}
                  to={"/students/" + s._id}
                >
                  <strong>
                    {s.firstName} {s.lastName}
                  </strong>
                  <small>
                    {s.studentId} · {s.department}
                  </small>
                </Link>
              ))}
              {!results.data.students.length && <p>No matching students.</p>}
              <h3>Courses</h3>
              {results.data.courses.map((c) => (
                <Link
                  className="command-result"
                  onClick={onClose}
                  key={c._id}
                  to={"/courses?search=" + encodeURIComponent(c.code)}
                >
                  <strong>
                    {c.code} · {c.name}
                  </strong>
                  <small>{c.department}</small>
                </Link>
              ))}
              {!results.data.courses.length && <p>No matching courses.</p>}
            </div>
          ))}
      </div>
    </Modal>
  );
}
