import { MessageSquare, HelpCircle, StickyNote, FileText, Database } from "lucide-react";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";

const tabs: TabRoute[] = [
  {
    id: "qa",
    label: "Q&A Chat",
    icon: <MessageSquare className="h-4 w-4" />,
    to: "/rag/qa",
  },
  {
    id: "questions",
    label: "Generate Questions",
    icon: <HelpCircle className="h-4 w-4" />,
    to: "/rag/questions",
  },
  {
    id: "notes",
    label: "Generate Notes",
    icon: <StickyNote className="h-4 w-4" />,
    to: "/rag/notes",
  },
  {
    id: "documents",
    label: "Manage Documents",
    icon: <FileText className="h-4 w-4" />,
    to: "/rag/documents",
  },
  {
    id: "audit",
    label: "Knowledge Audit",
    icon: <Database className="h-4 w-4" />,
    to: "/rag/audit",
  },
];

export function RagPage() {
  return (
    <ModulePageLayout tabs={tabs} />
  );
}
