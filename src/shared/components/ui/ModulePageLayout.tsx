import { useLocation } from "react-router-dom";
import { PageHeader } from "./PageHeader";
import { TabContainer, type TabRoute } from "./TabContainer";

interface ModulePageLayoutProps {
  title: string;
  tabs: TabRoute[];
  descriptions?: Record<string, string>;
  actions?: React.ReactNode;
}

/**
 * Shared shell for the 4 main module pages (Attendance, Recording, RAG,
 * Survey): a PageHeader whose description follows the active tab, plus a
 * TabContainer rendering the tab bar and the matched child route.
 */
export function ModulePageLayout({
  title,
  tabs,
  descriptions,
  actions,
}: ModulePageLayoutProps) {
  const location = useLocation();
  const activeTab =
    tabs.find((tab) =>
      tab.end
        ? location.pathname === tab.to
        : location.pathname.startsWith(tab.to),
    )?.id ?? tabs[0]?.id;

  return (
    <div className="flex h-full w-full justify-center">
      <div className="flex h-full w-full max-w-6xl flex-col space-y-6">
        <PageHeader
          title={title}
          description={activeTab ? descriptions?.[activeTab] : undefined}
          actions={actions}
        />
        <TabContainer tabs={tabs} />
      </div>
    </div>
  );
}
