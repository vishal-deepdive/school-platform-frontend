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

const descriptions: Record<string, string> = {
  dashboard: "Student feedback overview across schools and classes.",
  search: "Ask questions about student feedback in natural language.",
  data: "Delete survey records by roll number, school, or class.",
  source: "Connect the public Google Sheet your survey responses come from.",
};

export function SurveyPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManageSource = role === "admin" || role === "principal";
  const tabs = canManageSource ? [...baseTabs, sourceTab] : baseTabs;

  return (
    <ModulePageLayout title="Survey Analytics" tabs={tabs} descriptions={descriptions} />
  );
}
