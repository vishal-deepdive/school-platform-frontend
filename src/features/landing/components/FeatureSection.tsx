import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Check,
  Play,
  Building2,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { TrendChart } from "@/features/landing/components/DashboardPreview";
import { ParallaxAccents } from "@/features/landing/components/scroll";
import { fadeUp, staggerContainer, EASE_OUT_EXPO } from "@/features/landing/animations";

const REGISTER_ROWS = [
  { roll: "07", name: "Aarav Gupta" },
  { roll: "18", name: "Diya Sharma" },
  { roll: "31", name: "Kabir Singh" },
];

function AttendanceVignette() {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="mt-7 rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-foreground">
          Class 8B — morning register
        </span>
        <span className="text-muted-foreground">{today}</span>
      </div>
      <ul className="mt-3 divide-y divide-border/60">
        {REGISTER_ROWS.map((row, i) => (
          <li
            key={row.roll}
            className="flex items-center gap-3 py-2.5 text-sm"
          >
            <span className="w-7 font-medium tabular-nums text-muted-foreground">
              {row.roll}
            </span>
            <span className="flex-1 text-foreground/85">{row.name}</span>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.35 + i * 0.18,
                duration: 0.3,
                ease: EASE_OUT_EXPO,
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        62 of 64 marked · finished in 47 seconds
      </div>
    </div>
  );
}

const QA_ANSWER =
  "Light slows down when it enters water, so the rays bend — that's refraction. Ma'am covered this with the coin experiment.";

function QAVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = useReducedMotion();
  const [chars, setChars] = useState(0);
  const done = chars >= QA_ANSWER.length;

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setChars(QA_ANSWER.length);
      return;
    }
    // Wait for the question bubble to land, then stream the answer.
    const start = setTimeout(() => {
      const id = setInterval(() => {
        setChars((c) => {
          if (c >= QA_ANSWER.length) {
            clearInterval(id);
            return c;
          }
          return c + 1;
        });
      }, 18);
    }, 900);
    return () => clearTimeout(start);
  }, [inView, reduceMotion]);

  return (
    <div ref={ref} className="mt-7 space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4, ease: EASE_OUT_EXPO }}
        className="ml-8 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground"
      >
        Why does a pencil look bent in water? I missed Friday's class.
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55, duration: 0.4, ease: EASE_OUT_EXPO }}
        className="mr-8 rounded-2xl rounded-bl-md border border-border bg-background/60 px-4 py-3"
      >
        <p className="min-h-[3lh] text-sm leading-relaxed text-foreground/85">
          {QA_ANSWER.slice(0, chars)}
          {!done && (
            <span
              className="ml-px inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-primary"
              aria-hidden="true"
            />
          )}
        </p>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={done ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground"
        >
          <Play className="h-3 w-3" />
          Physics — Light &amp; Refraction, 12:40
        </motion.span>
      </motion.div>
    </div>
  );
}

function RecordingVignette() {
  return (
    <div className="mt-7 rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            Light &amp; Refraction — Class 8
          </div>
          <div className="text-xs text-muted-foreground">
            42 min · uploaded today
          </div>
        </div>
      </div>
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-border">
        <motion.div
          initial={{ width: "0%" }}
          whileInView={{ width: "68%" }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 1.1, ease: EASE_OUT_EXPO }}
          className="h-full rounded-full bg-primary"
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
        <span>28:33</span>
        <span>42:10</span>
      </div>
    </div>
  );
}

function AnalyticsVignette() {
  return (
    <div className="mt-7 rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-foreground">
          Attendance — Term 1
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="h-3.5 w-3.5" />
          2.1% this month
        </span>
      </div>
      <TrendChart className="mt-2 h-24 w-full" delay={0.3} />
    </div>
  );
}

const CORE_FEATURES = [
  {
    title: "Attendance in seconds, not periods",
    description:
      "Teachers mark a full register in under a minute. Date-range views and per-student statistics come free with it.",
    span: "lg:col-span-7",
    vignette: AttendanceVignette,
  },
  {
    title: "Answers grounded in your lectures",
    description:
      "Students ask in plain language; the AI answers from your school's own recordings and points to the exact class.",
    span: "lg:col-span-5",
    vignette: QAVignette,
  },
  {
    title: "Every lecture, kept and searchable",
    description:
      "Record and upload classes securely. Students revisit any lesson the same evening — no more lost notes.",
    span: "lg:col-span-5",
    vignette: RecordingVignette,
  },
  {
    title: "Numbers the staff room can act on",
    description:
      "Attendance trends, survey feedback, and engagement on one dashboard — visible the moment they change.",
    span: "lg:col-span-7",
    vignette: AnalyticsVignette,
  },
];

const SUPPORTING = [
  {
    icon: Building2,
    title: "Guided onboarding",
    description:
      "A step-by-step application takes your institution from first contact to fully live in days, not months.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    description:
      "Admins, teachers, students, and parents each see exactly what they should — nothing more.",
  },
];

function SpotlightCard({ children, className, variants }: any) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={divRef}
      variants={variants}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, oklch(var(--primary)/0.12), transparent 40%)`,
        }}
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </motion.div>
  );
}

export function FeatureSection() {
  return (
    <section id="features" className="relative w-full scroll-mt-24 bg-background dark:bg-[#0b0e14] py-16 sm:py-20 lg:py-24">
      <ParallaxAccents />
      <div className="relative mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="The platform"
          title="Everything the school day runs on"
          subtitle="Four core modules that share one login, one database, and one source of truth — for teachers, students, and administrators alike."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12"
        >
          {CORE_FEATURES.map((feature) => (
            <SpotlightCard
              key={feature.title}
              variants={fadeUp}
              className={`flex flex-col rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-lg md:col-span-1 ${feature.span}`}
            >
              <h3 className="text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
              <div className="mt-auto pt-6">
                <feature.vignette />
              </div>
            </SpotlightCard>
          ))}

          {SUPPORTING.map((item) => (
            <SpotlightCard
              key={item.title}
              variants={fadeUp}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-lg md:col-span-1 lg:col-span-6"
            >
              <item.icon
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
