import { TabContainer, type TabRoute } from "./TabContainer";

interface ModulePageLayoutProps {
  tabs: TabRoute[];
}

/**
 * Shared shell for the 4 main module pages (Attendance, Recording, RAG,
 * Survey): a TabContainer rendering the tab bar and the matched child route.
 */
export function ModulePageLayout({
  tabs,
}: ModulePageLayoutProps) {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="flex h-full w-full max-w-6xl flex-col">
        <TabContainer tabs={tabs} />
      </div>
    </div>
  );
}
