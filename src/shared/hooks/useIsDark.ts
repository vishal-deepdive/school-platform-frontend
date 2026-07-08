import { useEffect, useState } from "react";

function readIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Reactive dark-mode flag sourced from the `.dark` class on <html>.
 *
 * Observes the document class via MutationObserver so any component that
 * needs to bake theme colours into its output (e.g. Mermaid diagrams, code
 * highlighters) stays in sync without prop drilling. Prefer {@link useTheme}
 * when you also need the toggle action.
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
