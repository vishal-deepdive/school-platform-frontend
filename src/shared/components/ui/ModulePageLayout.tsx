import { TabContainer } from "./TabContainer";

/**
 * Shared shell for the 4 main module pages (Attendance, Recording, RAG,
 * Survey): a TabContainer rendering the matched child route. Spans the full
 * content area so the panel sits flush against the secondary sidebar; content
 * width is capped inside TabContainer's scroll area instead.
 */
export function ModulePageLayout() {
  return <TabContainer />;
}
