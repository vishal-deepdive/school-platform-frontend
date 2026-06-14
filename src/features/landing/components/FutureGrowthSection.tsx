import { motion } from "framer-motion";
import { TrendingUp, Users, Activity } from "lucide-react";
import {
  fadeUp,
  staggerContainer,
  scaleIn,
} from "@/features/landing/animations";

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

export function FutureGrowthSection() {
  return (
    <section id="growth" className="w-full scroll-mt-24 bg-background py-24">
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
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/25">
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

          {/* Right: dashboard preview */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-primary/10 via-sky-300/10 to-transparent blur-2xl" />

            <div className="relative rounded-3xl bg-card p-2 shadow-2xl shadow-black/10 ring-1 ring-border">
              <img
                src="/images/demo-chart.png"
                alt="DeepDive analytics dashboard"
                className="h-auto w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>

            {/* Floating accent: monthly growth */}
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="absolute -bottom-6 -left-6 hidden animate-float items-center gap-4 rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border md:flex"
            >
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Monthly Growth
                </div>
                <div className="text-lg font-bold text-foreground">+14.2%</div>
              </div>
            </motion.div>

            {/* Floating accent: active today */}
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="absolute -right-5 -top-6 hidden animate-float items-center gap-4 rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border [animation-delay:1.5s] md:flex"
            >
              <div className="rounded-xl bg-sky-100 dark:bg-sky-900/30 p-2.5 text-sky-600 dark:text-sky-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Active Today
                </div>
                <div className="text-lg font-bold text-foreground">12,480</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
