import {
  UserCheck,
  Mic,
  BookOpen,
  BarChart2,
  Users,
  TrendingUp,
  Upload,
  Search,
  Activity,
  MessageSquare,
  StickyNote,
  Shield,
  ClipboardList,
  UserCog,
  LayoutDashboard,
  Wand2,
  FileQuestion,
  Library,
  Gauge,
  PlayCircle,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  ScanFace,
  Camera,
  History,
  CalendarClock,
  CalendarDays,
  CheckSquare,
} from "lucide-react";

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  end?: boolean;
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
        label: "Overview",
        href: "/attendance/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: "Face Enrollment",
        href: "/attendance/enroll",
        icon: <ScanFace className="h-4 w-4" />,
      },
      {
        label: "Roll Call",
        href: "/attendance/roll-call",
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        label: "Mark Attendance",
        href: "/attendance/mark",
        icon: <CheckSquare className="h-4 w-4" />,
      },
      {
        label: "Attendance Records",
        href: "/attendance/view",
        icon: <History className="h-4 w-4" />,
      },
      {
        label: "Leave Requests",
        href: "/attendance/leave",
        icon: <CalendarClock className="h-4 w-4" />,
      },
      {
        label: "Attendance Reports",
        href: "/attendance/stats",
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        label: "Holiday Calendar",
        href: "/attendance/holidays",
        icon: <CalendarDays className="h-4 w-4" />,
      },
      {
        label: "Student Roster",
        href: "/attendance/manage",
        icon: <Users className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Lecture Capture",
    icon: <Mic className="h-5 w-5" />,
    children: [
      {
        label: "New Recording",
        href: "/recording/upload",
        icon: <Upload className="h-4 w-4" />,
      },
      {
        label: "My Lectures",
        href: "/recording/list",
        icon: <PlayCircle className="h-4 w-4" />,
      },
      {
        label: "Find in Notes",
        href: "/recording/search",
        icon: <Search className="h-4 w-4" />,
      },
      {
        label: "Activity Log",
        href: "/recording/audit",
        icon: <Activity className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Study Assistant",
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      {
        label: "Ask a Doubt",
        href: "/rag/qa",
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        label: "Practice Test Generator",
        href: "/rag/questions",
        icon: <FileQuestion className="h-4 w-4" />,
      },
      {
        label: "Smart Notes",
        href: "/rag/notes",
        icon: <StickyNote className="h-4 w-4" />,
      },
      {
        label: "Textbook Library",
        href: "/rag/documents",
        icon: <Library className="h-4 w-4" />,
      },
      {
        label: "Content Coverage",
        href: "/rag/audit",
        icon: <Gauge className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Feedback Insights",
    icon: <BarChart2 className="h-5 w-5" />,
    children: [
      {
        label: "Overview",
        href: "/survey",
        icon: <LayoutDashboard className="h-4 w-4" />,
        end: true,
      },
      {
        label: "Ask Insights",
        href: "/survey/search",
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        label: "Data Cleanup",
        href: "/survey/data",
        icon: <Trash2 className="h-4 w-4" />,
      },
      {
        label: "Sheet Connections",
        href: "/survey/source",
        icon: <FileSpreadsheet className="h-4 w-4" />,
      },
    ],
  },
  // {
  //   label: "Parent Approvals",
  //   href: "/approvals/parents",
  //   icon: <UserCheck className="h-5 w-5" />,
  // },
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
      {
        label: "Prompts",
        href: "/admin/prompts",
        icon: <Wand2 className="h-4 w-4" />,
      },
    ],
  },
];
