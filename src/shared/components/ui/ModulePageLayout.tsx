import { TabContainer } from "./TabContainer";

/**
 * Shared shell for the 4 main module pages (Attendance, Recording, RAG,
 * Survey): a TabContainer rendering the matched child route.
 */
export function ModulePageLayout() {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="flex h-full w-full max-w-6xl flex-col">
        <TabContainer />
      </div>
    </div>
  );
}
