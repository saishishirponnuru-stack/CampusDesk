import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { api, setToken } from "./api";
import { modules, label } from "./config";
import { Loading } from "./components/Feedback";
import { GlobalSearch } from "./components/GlobalSearch";
import { ThemeProvider, ThemeSelector } from "./components/Theme";
import { Brand, AcademicIcon } from "./components/Brand";
import { Login } from "./features/Login";
import "./styles.css";
import "./styles/operations.css";
const Dashboard = lazy(() => import("./features/Dashboard"));
const AttendanceRegister = lazy(() => import("./features/AttendanceRegister"));
const StudentImport = lazy(() => import("./features/StudentImport"));
const Records = lazy(() => import("./features/Records"));
const StudentProfile = lazy(() => import("./features/StudentProfile"));
const CourseProfile = lazy(() => import("./features/CourseProfile"));
const Reports = lazy(() => import("./features/Reports"));
const SettingsPage = lazy(() => import("./features/Settings"));
import { client } from "./queryClient";
const navItems = [
  "dashboard",
  "students",
  "courses",
  "enrollments",
  "attendance",
  "grades",
  "reports",
  "settings",
];
export function App() {
  return (
    <ThemeProvider>
      <Workspace />
    </ThemeProvider>
  );
}
function Workspace() {
  const [signedIn, login] = useState(false),
    [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const location = useLocation();
  const drawer = useRef(null),
    menuButton = useRef(null),
    main = useRef(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const closeDesktop = () => {
      if (!media.matches) setMobile(false);
    };
    media.addEventListener("change", closeDesktop);
    return () => media.removeEventListener("change", closeDesktop);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = drawer.current;
    const focusClose = () =>
      panel?.querySelector(".mobile-close")?.focus({ preventScroll: true });
    const focusFrame = requestAnimationFrame(focusClose);
    const visible = (event) => {
      if (event.target === panel && !panel.contains(document.activeElement))
        focusClose();
    };
    panel?.addEventListener("transitionend", visible);
    const keys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
      }
      if (event.key !== "Tab") return;
      const targets = [...drawer.current.querySelectorAll("a, button")].filter(
        (el) => el.getClientRects().length,
      );
      const first = targets[0],
        last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      cancelAnimationFrame(focusFrame);
      panel?.removeEventListener("transitionend", visible);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keys);
      menuButton.current?.focus();
    };
  }, [mobile]);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("/auth/me"),
    enabled: signedIn,
  });
  const logout = () => {
    setToken("");
    login(false);
    client.clear();
  };
  useEffect(() => {
    const end = () => {
      setSessionNotice(
        "Your session has expired. Please sign in again to continue.",
      );
      logout();
    };
    window.addEventListener("session-expired", end);
    return () => window.removeEventListener("session-expired", end);
  }, []);
  useEffect(() => {
    setMobile(false);
    document.title =
      "CampusDesk · " +
      (signedIn
        ? label(location.pathname.split("/")[1] || "dashboard")
        : "Sign in");
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname, signedIn]);
  if (!signedIn)
    return (
      <>
        {sessionNotice && (
          <div className="session-notice" role="status">
            {sessionNotice}
          </div>
        )}
        <Login
          onLogin={(value) => {
            setSessionNotice("");
            login(value);
          }}
        />
      </>
    );
  const current = location.pathname.split("/")[1] || "dashboard";
  return (
    <div className={collapsed ? "app collapsed" : "app"}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside
        ref={drawer}
        className={mobile ? "sidebar open" : "sidebar"}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile || undefined}
        aria-label={mobile ? "Workspace navigation" : undefined}
      >
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <Link className="brand" to="/">
          <Brand />
        </Link>
        <button
          className="collapse-toggle icon-button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <div className="workspace">
          <span className="workspace-icon">CD</span>
          <div>
            Academic workspace<small>Your institution, connected</small>
          </div>
        </div>
        <span className="nav-label">Workspace</span>
        <nav aria-label="Main navigation">
          {navItems.map((key) => (
            <NavLink
              key={key}
              to={key === "dashboard" ? "/" : "/" + key}
              end={key === "dashboard"}
              title={label(key)}
              aria-label={label(key)}
            >
              {key === "settings" ? (
                <Settings size={20} />
              ) : (
                <AcademicIcon kind={key} size={21} />
              )}
              <span className="nav-text">{label(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{me.data?.name?.[0] || "A"}</span>
          <div>
            {me.data?.name || "Administrator"}
            <small>Administrator</small>
          </div>
          <button
            aria-label="Log out"
            className="icon-button"
            onClick={async () => {
              try {
                await api("/auth/logout", { method: "POST" });
              } finally {
                logout();
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-wrap" inert={mobile ? true : undefined}>
        <header className="topbar">
          <button
            ref={menuButton}
            aria-label="Open navigation"
            aria-expanded={mobile}
            className="mobile-toggle icon-button"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <span className="muted">
            <span>Workspace</span> <span className="slash">/</span>{" "}
            <strong>{label(current)}</strong>
          </span>
          <div className="topbar-right">
            <GlobalSearch />
            <ThemeSelector />
            <span className="term">
              <span className="dot" />
              Academic administration
            </span>
            <Link to="/settings" className="avatar" aria-label="Your profile">
              {me.data?.name?.[0] || "A"}
            </Link>
          </div>
        </header>
        <main id="main" ref={main} tabIndex="-1">
          <div key={location.pathname} className="page-enter">
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route
                  path="/attendance/register"
                  element={<AttendanceRegister />}
                />
                <Route path="/students/import" element={<StudentImport />} />
                {Object.keys(modules).map((kind) => (
                  <Route
                    key={kind}
                    path={"/" + kind}
                    element={<Records key={kind} kind={kind} />}
                  />
                ))}
                <Route path="/students/:id" element={<StudentProfile />} />
                <Route path="/courses/:id" element={<CourseProfile />} />
                <Route path="/reports" element={<Reports />} />
                <Route
                  path="/settings"
                  element={<SettingsPage me={me} logout={logout} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
