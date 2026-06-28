import { BarChart2, Search, Database, Link2 } from "lucide-react";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";
import { useAuthStore } from "@/features/auth/store/auth";

const baseTabs: TabRoute[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <BarChart2 className="h-4 w-4" />,
    to: "/survey",
    end: true,
  },
  {
    id: "search",
    label: "AI Search",
    icon: <Search className="h-4 w-4" />,
    to: "/survey/search",
  },
  {
    id: "data",
    label: "Data Management",
    icon: <Database className="h-4 w-4" />,
    to: "/survey/data",
  },
];

// Data Source management is admin/principal only (matches ROUTE_ROLES); teachers
// never see the tab.
const sourceTab: TabRoute = {
  id: "source",
  label: "Data Source",
  icon: <Link2 className="h-4 w-4" />,
  to: "/survey/source",
};

export function SurveyPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManageSource = role === "admin" || role === "principal";
  const tabs = canManageSource ? [...baseTabs, sourceTab] : baseTabs;

  return (
    <ModulePageLayout tabs={tabs} />
  );
}
