import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Teleports page-level actions (filters, primary CTAs, pickers) into the
 * fixed module header rendered by TabContainer, so they stay visible while
 * the page content scrolls underneath.
 *
 * Usage inside any module page:
 *   <ModuleHeaderActions>
 *     <Button onClick={...}>New recording</Button>
 *   </ModuleHeaderActions>
 *
 * Renders nothing when no module header exists (e.g. full-screen pages).
 */
export function ModuleHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setTarget(document.getElementById("module-header-actions"));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
