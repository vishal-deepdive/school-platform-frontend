import {
  UserCheck,
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
  LayoutDashboard,
  Wand2,
  FileQuestion,
  Library,
  Gauge,
  PlayCircle,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  History,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  FileUp,
  User,
  AudioLines,
  SmilePlus,
  Dumbbell,
  Layers,
  GraduationCap,
  Inbox,
  MessageSquareWarning,
  Building,
  UserCog,
} from "lucide-react";

export interface NavItem {
  label: string;
  /** Short caption under the rail icon (≤10 chars); defaults to `label`. */
  railLabel?: string;
  /**
   * Optional caption a child belongs under in the secondary pane. Children
   * sharing a group must be listed contiguously; the heading renders once,
   * above the first surviving child, and disappears entirely if role-filtering
   * removes every child under it.
   */
  group?: string;
  /**
   * Names a live counter shown as a badge on this item (and aggregated onto its
   * parent's rail icon). The Sidebar maps the key to a data hook, keeping this
   * config free of data concerns.
   */
  badgeKey?: "pending-leaves";
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  end?: boolean;
  /** Hidden from the sidebar but included in TabContainer route matching. */
  hidden?: boolean;
  /** Skip the TabContainer breadcrumb header for this route. */
  noHeader?: boolean;
  /**
   * Full-height "app" page (e.g. the Q&A chat): the TabContainer content area
   * gives it an exact height and trims its own vertical padding so the page
   * owns its internal scroll instead of the shell scrolling.
   */
  fullBleed?: boolean;
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    railLabel: "Home",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    noHeader: true,
  },
  {
    label: "Attendance",
    icon: <UserCheck className="h-5 w-5" />,
    children: [
      {
        label: "Overview",
        href: "/attendance/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        group: "Daily",
      },
      {
        label: "Roll Call",
        href: "/attendance/roll-call",
        icon: <ClipboardList className="h-4 w-4" />,
        group: "Daily",
      },
      {
        label: "Mark Attendance",
        href: "/attendance/mark",
        icon: <CheckSquare className="h-4 w-4" />,
        group: "Daily",
      },
      {
        label: "Attendance Records",
        href: "/attendance/view",
        icon: <History className="h-4 w-4" />,
        group: "Daily",
      },
      {
        label: "Leave Requests",
        href: "/attendance/leave",
        icon: <CalendarClock className="h-4 w-4" />,
        group: "Requests & reports",
        badgeKey: "pending-leaves",
      },
      {
        label: "Enrollment Stats",
        href: "/attendance/stats",
        icon: <TrendingUp className="h-4 w-4" />,
        group: "Requests & reports",
      },
      {
        label: "Holiday Calendar",
        href: "/attendance/holidays",
        icon: <CalendarDays className="h-4 w-4" />,
        group: "Requests & reports",
      },
      {
        label: "Face Enrollment",
        href: "/attendance/enroll",
        icon: <SmilePlus className="h-4 w-4" />,
        group: "Setup",
      },
      {
        label: "Student Roster",
        href: "/attendance/manage",
        icon: <Users className="h-4 w-4" />,
        group: "Setup",
      },
      {
        label: "Import Students",
        href: "/students/import",
        icon: <FileUp className="h-4 w-4" />,
        group: "Setup",
      },
      {
        label: "Change Log",
        href: "/attendance/audit-log",
        icon: <History className="h-4 w-4" />,
        group: "Setup",
      },
    ],
  },
  {
    label: "Lecture Capture",
    railLabel: "Lectures",
    icon: <AudioLines className="h-5 w-5" />,
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
    railLabel: "Study",
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      {
        label: "Ask a Doubt",
        href: "/rag/qa",
        icon: <MessageSquare className="h-4 w-4" />,
        fullBleed: true,
        group: "Learn",
      },
      {
        label: "Practice",
        href: "/rag/practice",
        icon: <Dumbbell className="h-4 w-4" />,
        group: "Learn",
      },
      {
        label: "Flashcards",
        href: "/rag/flashcards",
        icon: <Layers className="h-4 w-4" />,
        group: "Learn",
      },
      {
        label: "Smart Notes",
        href: "/rag/notes",
        icon: <StickyNote className="h-4 w-4" />,
        group: "Learn",
      },
      {
        label: "Practice Test Generator",
        href: "/rag/questions",
        icon: <FileQuestion className="h-4 w-4" />,
        group: "Create",
      },
      {
        label: "Assignments",
        href: "/rag/assignments",
        icon: <ClipboardList className="h-4 w-4" />,
        group: "Create",
      },
      {
        label: "Lesson Plans",
        href: "/rag/lesson-plan",
        icon: <GraduationCap className="h-4 w-4" />,
        group: "Create",
      },
      {
        label: "Textbook Library",
        href: "/rag/documents",
        icon: <Library className="h-4 w-4" />,
        group: "Library",
      },
      {
        label: "Content Requests",
        href: "/rag/requests",
        icon: <Inbox className="h-4 w-4" />,
        group: "Library",
      },
      {
        label: "Library Insights",
        href: "/rag/insights",
        icon: <BarChart2 className="h-4 w-4" />,
        group: "Insights",
      },
      {
        label: "Content Coverage",
        href: "/rag/audit",
        icon: <Gauge className="h-4 w-4" />,
        group: "Insights",
      },
      {
        label: "Answer Reviews",
        href: "/rag/review",
        icon: <MessageSquareWarning className="h-4 w-4" />,
        group: "Insights",
      },
    ],
  },
  {
    label: "Feedback Insights",
    railLabel: "Feedback",
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
  {
    // principal only (ROUTE_ROLES "/school": ["principal"]); admins manage every
    // school via Platform Admin → Schools instead. Staff (team + invites) and
    // Parent Approvals live as tabs inside this cockpit, not separate nav items.
    label: "My School",
    railLabel: "School",
    href: "/school",
    icon: <Building className="h-5 w-5" />,
  },
  {
    label: "My Profile",
    href: "/profile",
    icon: <User className="h-5 w-5" />,
    hidden: true,
  },
];

export const adminNavItems: NavItem[] = [
  {
    label: "Platform Admin",
    railLabel: "Admin",
    icon: <Shield className="h-5 w-5" />,
    children: [
      {
        label: "School Applications",
        href: "/admin/onboarding",
        icon: <ClipboardList className="h-4 w-4" />,
        group: "Organizations",
      },
      {
        label: "Schools",
        href: "/admin/schools",
        icon: <Building className="h-4 w-4" />,
        group: "Organizations",
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: <Users className="h-4 w-4" />,
        group: "People",
      },
      {
        label: "Admins",
        href: "/admin/admins",
        icon: <UserCog className="h-4 w-4" />,
        group: "People",
      },
      {
        label: "Audit Log",
        href: "/admin/audit-log",
        icon: <History className="h-4 w-4" />,
        group: "System",
      },
      {
        label: "Prompts",
        href: "/admin/prompts",
        icon: <Wand2 className="h-4 w-4" />,
        group: "System",
      },
    ],
  },
];
