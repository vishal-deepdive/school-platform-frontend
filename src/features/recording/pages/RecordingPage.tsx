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

const descriptions: Record<string, string> = {
  upload:
    "Upload a lecture recording to generate a transcript, notes, and exam questions.",
  list: "Browse, preview, and manage your generated lecture recordings.",
  search: "Search through generated transcripts, notes, and questions.",
  audit: "Activity log of recording uploads and processing.",
};

export function RecordingPage() {
  return (
    <ModulePageLayout title="Recording" tabs={tabs} descriptions={descriptions} />
  );
}
