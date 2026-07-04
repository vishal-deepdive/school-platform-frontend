import { motion } from "framer-motion";
import { School, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fadeUp,
  staggerContainer,
  scaleIn,
} from "@/features/landing/animations";

const BENEFITS = [
  "Complete student management system",
  "Real-time attendance tracking",
  "Searchable lecture recording library",
  "AI-powered Q&A on course material",
];

export function OnboardingSection() {
  return (
    <section
      id="onboard"
      className="mx-auto w-full max-w-[1180px] scroll-mt-24 px-4 py-24 xl:px-0"
    >
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-card dark:ring-1 dark:ring-border px-6 py-16 sm:px-12 sm:py-20 lg:px-16 md:flex md:items-center md:gap-12">
        {/* Background effects */}
        <div className="bg-grid-white absolute inset-0 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,black,transparent)]" />
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl"
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative z-10 md:w-[55%]"
        >
          <motion.div variants={fadeUp} className="mb-6 flex items-center gap-2">
            <div className="rounded-full bg-sky-400/15 p-2 text-sky-300 ring-1 ring-sky-400/20">
              <School className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-sky-300">
              Partner With Us
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Bring your school into the future.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg leading-8 text-slate-300 dark:text-muted-foreground"
          >
            Streamline administration, boost student engagement, and get
            real-time analytics. Join the network of modern institutions
            transforming education today.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"
          >
            <Link
              // to="/onboarding/apply"
              to="/"
              className="group inline-flex h-12 items-center justify-center rounded-lg bg-white dark:bg-primary px-8 text-sm font-semibold text-slate-900 dark:text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/10 dark:hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-white dark:focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-background"
            >
              Onboard New School
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/onboarding/status"
              className="text-sm font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
            >
              Track your application →
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative z-10 mt-12 md:mt-0 md:w-[45%]"
        >
          <div className="rounded-3xl border border-white/10 dark:border-border bg-white/5 dark:bg-secondary/20 p-8 shadow-2xl backdrop-blur-md">
            <h3 className="mb-6 text-xl font-medium text-white">
              What you get out of the box
            </h3>
            <ul className="space-y-5">
              {BENEFITS.map((benefit, i) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 0.4 }}
                  className="flex items-center gap-4 text-slate-200"
                >
                  <div className="flex-shrink-0 rounded-full bg-emerald-400/15 p-1 ring-1 ring-emerald-400/25">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-base">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
