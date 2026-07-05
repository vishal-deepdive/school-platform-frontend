import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  GraduationCap,
  BookOpen,
  Users,
  Check,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, EASE_OUT_EXPO } from "@/features/landing/animations";

interface Role {
  key: string;
  icon: LucideIcon;
  name: string;
  tagline: string;
  summary: string;
  points: string[];
}

const ROLES: Role[] = [
  {
    key: "admin",
    icon: Building2,
    name: "Administrators",
    tagline: "The whole institution, one screen",
    summary:
      "Oversee attendance, enrollment, staff, and engagement in real time — and approve who gets access to what.",
    points: [
      "Live attendance, enrollment, and engagement on one dashboard",
      "Approve staff and parent accounts with role-based access",
      "Review onboarding applications and provision admins",
      "Term-over-term analytics and survey feedback",
    ],
  },
  {
    key: "teacher",
    icon: GraduationCap,
    name: "Teachers",
    tagline: "Less admin, more teaching",
    summary:
      "Mark a full register in under a minute, keep lectures searchable, and let the AI field repeat doubts.",
    points: [
      "Mark a full class register in under a minute",
      "Upload and organize lecture recordings securely",
      "See per-class attendance trends at a glance",
      "Answer a doubt once — the AI reuses it for the class",
    ],
  },
  {
    key: "student",
    icon: BookOpen,
    name: "Students",
    tagline: "Never lose a lesson again",
    summary:
      "Revisit any class the same evening and ask questions grounded in your teachers' own recordings.",
    points: [
      "Rewatch any recorded class the same evening",
      "Ask questions in plain language, answered from real lectures",
      "Jump straight to the moment a topic was taught",
      "Track your own attendance and progress",
    ],
  },
  {
    key: "parent",
    icon: Users,
    name: "Parents",
    tagline: "A clear window into the school day",
    summary:
      "Follow your child's attendance and progress as it happens, with access scoped to your child alone.",
    points: [
      "Follow attendance and progress in real time",
      "Access the same lecture recordings your child does",
      "Fewer front-office queries, more clarity",
      "Secure login scoped to your child only",
    ],
  },
];

export function RolesSection() {
  const [activeKey, setActiveKey] = useState(ROLES[0].key);
  const active = ROLES.find((r) => r.key === activeKey) ?? ROLES[0];

  return (
    <section
      id="roles"
      className="w-full scroll-mt-24 border-t border-border bg-background py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="Access"
          title="One platform, four tailored views"
          subtitle="Everyone signs into the same system and sees exactly what their role needs — nothing more."
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
          {/* Role selector — vertical tabs on desktop, a wrapping row on mobile */}
          <div
            role="tablist"
            aria-label="Choose a role"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-1"
          >
            {ROLES.map((role) => {
              const selected = role.key === active.key;
              return (
                <button
                  key={role.key}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveKey(role.key)}
                  className={`group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:p-4 ${
                    selected
                      ? "border-primary/30 bg-primary/10"
                      : "border-border bg-card hover:border-primary/20 hover:bg-accent/40"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <role.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-sm font-semibold ${
                        selected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {role.name}
                    </span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block">
                      {role.tagline}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preview panel for the active role */}
          <div className="rounded-2xl border border-border bg-card p-7 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                role="tabpanel"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <active.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {active.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {active.tagline}
                    </p>
                  </div>
                </div>

                <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {active.summary}
                </p>

                <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  {active.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-foreground/85"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-8 text-sm text-muted-foreground"
        >
          Access is granted by your school's admin — every account is scoped to
          the right classes and permissions from day one.
        </motion.p>
      </div>
    </section>
  );
}
