import { Upload, FileText, Search, Activity } from "lucide-react";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";

const tabs: TabRoute[] = [
  {
    id: "upload",
    label: "Upload Audio",
    icon: <Upload className="h-4 w-4" />,
    to: "/recording/upload",
  },
  {
    id: "list",
    label: "My Recordings",
    icon: <FileText className="h-4 w-4" />,
    to: "/recording/list",
  },
  {
    id: "search",
    label: "Search Notes",
    icon: <Search className="h-4 w-4" />,
    to: "/recording/search",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: <Activity className="h-4 w-4" />,
    to: "/recording/audit",
  },
];

export function RecordingPage() {
  return (
    <ModulePageLayout tabs={tabs} />
  );
}
