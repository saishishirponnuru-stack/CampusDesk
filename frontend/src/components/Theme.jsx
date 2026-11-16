import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const ThemeContext = createContext(null);
const modes = { light: Sun, dark: Moon, system: Monitor };
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const value = localStorage.getItem("campusdesk-theme");
      return Object.hasOwn(modes, value) ? value : "system";
    } catch {
      return "system";
    }
  });
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    try {
      localStorage.setItem("campusdesk-theme", theme);
    } catch {
      /* Storage may be blocked. */
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeSelector() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const { theme, setTheme } = context;
  const Icon = modes[theme];
  return (
    <label className="theme-selector">
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">Color theme</span>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

export function ThemeSettings() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  return (
    <div
      className="theme-previews"
      role="group"
      aria-label="Appearance preference"
    >
      {Object.entries(modes).map(([mode, Icon]) => (
        <button
          key={mode}
          className={"theme-preview " + mode}
          aria-pressed={context.theme === mode}
          onClick={() => context.setTheme(mode)}
        >
          <span className="mini-workspace">
            <i />
            <i />
            <i />
          </span>
          <span>
            <Icon size={15} />
            {mode[0].toUpperCase() + mode.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );
}
