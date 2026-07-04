import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Video,
  BarChart3,
  Settings,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { CountUp } from "@/features/landing/components/interactive";
import { EASE_OUT_EXPO } from "@/features/landing/animations";

/* ── Animated attendance trend line (drawn SVG, no images) ───────────────── */
export function TrendChart({
  className = "h-36 w-full",
  delay = 0.4,
}: {
  className?: string;
  delay?: number;
}) {
  const line =
    "M8,118 C48,108 78,88 108,92 C138,96 158,64 198,60 C238,56 258,76 298,66 C338,56 368,36 408,32 C428,30 448,28 464,26";
  const area = `${line} L464,150 L8,150 Z`;

  return (
    <svg
      viewBox="0 0 480 150"
      preserveAspectRatio="none"
      className={`text-primary ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[36, 76, 116].map((y) => (
        <line
          key={y}
          x1="8"
          x2="472"
          y1={y}
          y2={y}
          className="stroke-border"
          strokeWidth="1"
          strokeDasharray="3 6"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <motion.path
        d={area}
        fill="url(#trend-fill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.5, duration: 0.8 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 1.4, ease: EASE_OUT_EXPO }}
      />
      <motion.circle
        cx="464"
        cy="26"
        r="4"
        fill="currentColor"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 1.2, duration: 0.3 }}
      />
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Students", active: false },
  { icon: CalendarCheck2, label: "Attendance", active: false },
  { icon: Video, label: "Recordings", active: false },
  { icon: BarChart3, label: "Analytics", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const KPIS = [
  {
    icon: Users,
    label: "Total Students",
    value: 1248,
    suffix: "",
    decimals: 0,
    delta: "+3.2% this term",
  },
  {
    icon: CalendarCheck2,
    label: "Attendance Today",
    value: 96.4,
    suffix: "%",
    decimals: 1,
    delta: "+1.8% vs last week",
  },
  {
    icon: Video,
    label: "Lectures Recorded",
    value: 312,
    suffix: "",
    decimals: 0,
    delta: "+24 this week",
  },
];

const ACTIVITY = [
  {
    icon: CalendarCheck2,
    text: "Class 8B attendance marked",
    time: "2 min ago",
  },
  { icon: Video, text: "Physics lecture uploaded", time: "18 min ago" },
  { icon: BarChart3, text: "Term survey responses in", time: "1 hr ago" },
];

const QA_BARS = [42, 65, 50, 80, 68, 92, 74];

export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-2xl shadow-primary/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-border" />
          ))}
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
          <Lock className="h-3 w-3" />
          app.deepdive.in/dashboard
        </div>
        <div className="w-12" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-border p-3 sm:flex">
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-card-foreground">
                Dashboard overview
              </div>
              <div className="text-xs text-muted-foreground">
                Monday, 6 July — Term 1
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3">
            {KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-border bg-background/60 p-3 sm:p-4"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:text-xs">
                  <kpi.icon className="hidden h-3.5 w-3.5 sm:block" />
                  <span className="truncate">{kpi.label}</span>
                </div>
                <div className="mt-1.5 text-lg font-semibold tracking-tight text-card-foreground sm:text-2xl">
                  <CountUp
                    to={kpi.value}
                    suffix={kpi.suffix}
                    decimals={kpi.decimals}
                  />
                </div>
                <div className="mt-0.5 truncate text-[10px] font-medium text-emerald-600 sm:text-[11px]">
                  {kpi.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Chart + activity */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border border-border bg-background/60 p-4 lg:col-span-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-card-foreground">
                  Attendance — last 7 days
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  2.1%
                </span>
              </div>
              <TrendChart className="h-28 w-full sm:h-32" />
              <div className="mt-1 flex justify-between px-1 text-[10px] font-medium text-muted-foreground">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <div className="mb-3 text-xs font-semibold text-card-foreground">
                  Q&A activity this week
                </div>
                <div className="flex h-14 items-end gap-1.5">
                  {QA_BARS.map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{
                        delay: 0.5 + i * 0.08,
                        duration: 0.6,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="flex-1 rounded-sm bg-primary/70"
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-border bg-background/60 p-4">
                <div className="mb-2.5 text-xs font-semibold text-card-foreground">
                  Recent activity
                </div>
                <div className="space-y-2.5">
                  {ACTIVITY.map((item, i) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7 + i * 0.15, duration: 0.35 }}
                      className="flex items-center gap-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
                        {item.text}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {item.time}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
