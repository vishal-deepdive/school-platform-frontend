import {
  UserCheck,
  Mic,
  BookOpen,
  BarChart2,
  Users,
  CheckSquare,
  List,
  TrendingUp,
  Upload,
  FileText,
  Search,
  Activity,
  MessageSquare,
  HelpCircle,
  StickyNote,
  Database,
  Shield,
  ClipboardList,
  UserCog,
  LayoutDashboard,
} from "lucide-react";

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Attendance",
    icon: <UserCheck className="h-5 w-5" />,
    children: [
      {
        label: "Enroll Students",
        href: "/attendance/enroll",
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Mark Attendance",
        href: "/attendance/mark",
        icon: <CheckSquare className="h-4 w-4" />,
      },
      {
        label: "View Records",
        href: "/attendance/view",
        icon: <List className="h-4 w-4" />,
      },
      {
        label: "Statistics",
        href: "/attendance/stats",
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Recording",
    icon: <Mic className="h-5 w-5" />,
    children: [
      {
        label: "Upload Audio",
        href: "/recording/upload",
        icon: <Upload className="h-4 w-4" />,
      },
      {
        label: "My Recordings",
        href: "/recording/list",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: "Search Notes",
        href: "/recording/search",
        icon: <Search className="h-4 w-4" />,
      },
      {
        label: "Audit Logs",
        href: "/recording/audit",
        icon: <Activity className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "RAG Assistant",
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      {
        label: "Q&A Chat",
        href: "/rag/qa",
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        label: "Generate Questions",
        href: "/rag/questions",
        icon: <HelpCircle className="h-4 w-4" />,
      },
      {
        label: "Generate Notes",
        href: "/rag/notes",
        icon: <StickyNote className="h-4 w-4" />,
      },
      {
        label: "Manage Documents",
        href: "/rag/documents",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: "Knowledge Audit",
        href: "/rag/audit",
        icon: <Database className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Survey Analytics",
    icon: <BarChart2 className="h-5 w-5" />,
    children: [
      {
        label: "Dashboard",
        href: "/survey",
        icon: <BarChart2 className="h-4 w-4" />,
      },
      {
        label: "AI Search",
        href: "/survey/search",
        icon: <Search className="h-4 w-4" />,
      },
      {
        label: "Data Management",
        href: "/survey/data",
        icon: <Database className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Parent Approvals",
    href: "/approvals/parents",
    icon: <UserCheck className="h-5 w-5" />,
  },
];

export const adminNavItems: NavItem[] = [
  {
    label: "Platform Admin",
    icon: <Shield className="h-5 w-5" />,
    children: [
      {
        label: "School Applications",
        href: "/admin/onboarding",
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        label: "Manage Admins",
        href: "/admin/admins",
        icon: <UserCog className="h-4 w-4" />,
      },
    ],
  },
];
