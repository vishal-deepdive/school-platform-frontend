import { useEffect, useState } from "react";

function readIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Reactive dark-mode flag sourced from the `.dark` class on <html>.
 *
 * Unlike {@link useTheme}, which owns the toggle and keeps per-instance state,
 * this hook only *observes* the document class, so any component (e.g. a code
 * block or Mermaid diagram that must bake theme colours into its output) stays
 * in sync no matter which component flipped the theme. Backed by a
 * MutationObserver so it updates without prop drilling.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    // Sync once in case the class changed between initial render and effect.
    setIsDark(root.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  return isDark;
}
