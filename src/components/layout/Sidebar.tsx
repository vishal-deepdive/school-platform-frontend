import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  UserCheck,
  Mic2,
  BookOpen,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Users,
  CheckSquare,
  List,
  TrendingUp,
  Upload,
  FileText,
  MessageSquare,
  HelpCircle,
  StickyNote,
  Activity,
  Search,
  Database,
  GraduationCap,
} from 'lucide-react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  section?: string
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Attendance',
    icon: <UserCheck className="h-4 w-4" />,
    section: 'FACE RECOGNITION',
    children: [
      { label: 'Enroll Students', href: '/attendance/enroll', icon: <Users className="h-4 w-4" /> },
      { label: 'Mark Attendance', href: '/attendance/mark', icon: <CheckSquare className="h-4 w-4" /> },
      { label: 'View Records', href: '/attendance/view', icon: <List className="h-4 w-4" /> },
      { label: 'Statistics', href: '/attendance/stats', icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Recording',
    icon: <Mic2 className="h-4 w-4" />,
    section: 'LECTURE AI',
    children: [
      { label: 'Upload Audio', href: '/recording/upload', icon: <Upload className="h-4 w-4" /> },
      { label: 'My Recordings', href: '/recording/list', icon: <FileText className="h-4 w-4" /> },
      { label: 'Audit Logs', href: '/recording/audit', icon: <Activity className="h-4 w-4" /> },
    ],
  },
  {
    label: 'RAG Assistant',
    icon: <BookOpen className="h-4 w-4" />,
    section: 'TEXTBOOK AI',
    children: [
      { label: 'Q&A Chat', href: '/rag/qa', icon: <MessageSquare className="h-4 w-4" /> },
      { label: 'Generate Questions', href: '/rag/questions', icon: <HelpCircle className="h-4 w-4" /> },
      { label: 'Generate Notes', href: '/rag/notes', icon: <StickyNote className="h-4 w-4" /> },
      { label: 'Knowledge Audit', href: '/rag/audit', icon: <Database className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Survey Analytics',
    icon: <BarChart2 className="h-4 w-4" />,
    section: 'FEEDBACK AI',
    children: [
      { label: 'Dashboard', href: '/survey', icon: <BarChart2 className="h-4 w-4" /> },
      { label: 'AI Search', href: '/survey/search', icon: <Search className="h-4 w-4" /> },
      { label: 'Data Management', href: '/survey/data', icon: <Database className="h-4 w-4" /> },
    ],
  },
]

interface SidebarItemProps {
  item: NavItem
  depth?: number
}

function SidebarItem({ item, depth = 0 }: SidebarItemProps) {
  const location = useLocation()
  const isChildActive = item.children?.some((c) => c.href && location.pathname.startsWith(c.href))
  const [open, setOpen] = useState(isChildActive ?? false)

  if (item.href) {
    return (
      <NavLink
        to={item.href}
        end={item.href === '/'}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            depth > 0 ? 'ml-4' : '',
            isActive
              ? 'bg-indigo-600 text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white',
          )
        }
      >
        {item.icon}
        {item.label}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isChildActive
            ? 'bg-slate-700 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white',
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-1">
          {item.children?.map((child) => (
            <SidebarItem key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col bg-slate-900',
        mobile && 'animate-slide-in',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">DeepDive</p>
          <p className="text-xs text-slate-400">School Platform</p>
        </div>
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item, i) => (
          <div key={i}>
            {item.section && (
              <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {item.section}
              </p>
            )}
            <SidebarItem item={item} />
          </div>
        ))}
      </nav>
    </aside>
  )
}
