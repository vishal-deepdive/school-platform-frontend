import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { TrendingUp, Users, Activity, ArrowUpRight } from "lucide-react";
import { fadeUp, staggerContainer, scaleIn } from "@/features/landing/animations";
import { TrendChart } from "@/features/landing/components/DashboardPreview";
import { CountUp } from "@/features/landing/components/interactive";

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Predictive Analytics",
    description:
      "Forecast student enrollment trends and resource needs months in advance.",
  },
  {
    icon: Users,
    title: "Engagement Metrics",
    description:
      "Track classroom participation and interactive learning success rates.",
  },
  {
    icon: Activity,
    title: "Real-time Activity",
    description:
      "Monitor live attendance and daily active usage across your entire platform.",
  },
];

const PANEL_STATS = [
  { label: "Avg. attendance", value: 96.4, suffix: "%", decimals: 1 },
  { label: "Active teachers", value: 640, suffix: "+", decimals: 0 },
  { label: "Partner schools", value: 1200, suffix: "+", decimals: 0 },
];

export function FutureGrowthSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [36, -36]);

  return (
    <section
      ref={sectionRef}
      id="growth"
      className="w-full scroll-mt-24 bg-background py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          {/* Left: text content */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="space-y-8 lg:pr-4"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary ring-1 ring-primary/15">
                Analytics
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-[2.6rem] md:leading-[1.15]">
                See your institution's growth before it happens
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Gain actionable insights into your institution's performance.
                Predict student success and streamline administrative
                efficiency with beautiful, real-time analytics.
              </p>
            </motion.div>

            <div className="space-y-6">
              {HIGHLIGHTS.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  className="group flex gap-4"
                >
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 text-primary transition-colors duration-300 group-hover:border-primary/25 group-hover:bg-primary/10">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: drawn analytics panel */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-primary/5 blur-2xl" />

            <motion.div
              style={{ y: parallaxY }}
              className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <div className="text-sm font-semibold text-card-foreground">
                    Enrollment growth
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Academic year 2025–26
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  14.2% YoY
                </span>
              </div>

              <div className="px-6 pt-6">
                <div className="text-xs font-medium text-muted-foreground">
                  Students enrolled
                </div>
                <div className="mt-1 text-4xl font-semibold tracking-tight text-card-foreground">
                  <CountUp to={12480} />
                </div>
              </div>

              <div className="px-4 pb-2 pt-4">
                <TrendChart className="h-40 w-full" delay={0.3} />
                <div className="mt-1 flex justify-between px-2 text-[10px] font-medium text-muted-foreground">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(
                    (m) => (
                      <span key={m}>{m}</span>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {PANEL_STATS.map((stat) => (
                  <div key={stat.label} className="px-4 py-4 text-center">
                    <div className="text-lg font-semibold tracking-tight text-card-foreground">
                      <CountUp
                        to={stat.value}
                        suffix={stat.suffix}
                        decimals={stat.decimals}
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
