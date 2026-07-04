import { useEffect, useState } from "react";

function getInitialIsDark(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(dark: boolean) {
  const root = window.document.documentElement;
  if (dark) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

// Module-level singleton so all useTheme() callers share one state and
// toggling from any component updates every other subscribed component.
type Listener = (isDark: boolean) => void;
const _listeners = new Set<Listener>();
let _isDark = getInitialIsDark();

if (typeof window !== "undefined") {
  applyTheme(_isDark);
}

function setGlobalDark(value: boolean) {
  _isDark = value;
  applyTheme(value);
  _listeners.forEach((fn) => fn(value));
}

export function useTheme() {
  const [isDark, setIsDark] = useState(_isDark);

  useEffect(() => {
    _listeners.add(setIsDark);
    // Sync in case theme changed between render and effect.
    setIsDark(_isDark);
    return () => {
      _listeners.delete(setIsDark);
    };
  }, []);

  const toggleTheme = () => setGlobalDark(!_isDark);

  return { isDark, toggleTheme };
}
