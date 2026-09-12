import { createPortal } from "react-dom";
import { useModuleHeaderSlots } from "./moduleHeaderSlots";

/**
 * Teleports page-level actions (primary CTAs, export buttons) into the right
 * edge of the module toolbar rendered by TabContainer, so they stay visible
 * while the page content scrolls underneath. The toolbar only takes up space
 * when a page actually renders something into it.
 *
 * Usage inside any module page:
 *   <ModuleHeaderActions>
 *     <Button onClick={...}>New recording</Button>
 *   </ModuleHeaderActions>
 *
 * Renders nothing outside a TabContainer.
 */
export function ModuleHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  const { trailing } = useModuleHeaderSlots();
  return trailing ? createPortal(children, trailing) : null;
}

/**
 * The toolbar's left side, for page context such as a view switcher. Keep it
 * compact — on phones it shares the row with the page title.
 */
export function ModuleHeaderLeading({
  children,
}: {
  children: React.ReactNode;
}) {
  const { leading } = useModuleHeaderSlots();
  return leading ? createPortal(children, leading) : null;
}
