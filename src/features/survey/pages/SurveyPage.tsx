import { BarChart2, Search, Database } from "lucide-react";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";

const tabs: TabRoute[] = [
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

const descriptions: Record<string, string> = {
  dashboard: "Student feedback overview across schools and classes.",
  search: "Ask questions about student feedback in natural language.",
  data: "Delete survey records by roll number, school, or class.",
};

export function SurveyPage() {
  return (
    <ModulePageLayout title="Survey Analytics" tabs={tabs} descriptions={descriptions} />
  );
}
