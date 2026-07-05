import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

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
      className="mx-auto w-full max-w-[1180px] scroll-mt-24 px-4 py-16 sm:py-20 lg:py-24 xl:px-0"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="overflow-hidden rounded-3xl bg-[hsl(212_62%_15%)] ring-1 ring-white/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
          <motion.div variants={fadeUp} className="p-8 sm:p-12 lg:p-14">
            <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              <span className="h-px w-7 bg-sky-300/60" aria-hidden="true" />
              Partner with us
            </span>

            <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-white md:text-4xl md:leading-[1.15]">
              Bring your school onto one platform this term.
            </h2>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">
              Streamline administration, keep students engaged, and see
              everything in real time. Applications take about ten minutes —
              most schools are live within the week.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                to="/onboarding/apply"
                className="group inline-flex h-12 items-center justify-center rounded-lg bg-white px-7 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[hsl(212_62%_15%)]"
              >
                Onboard your school
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/onboarding/status"
                className="text-sm font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
              >
                Track your application →
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex flex-col justify-center border-t border-white/10 p-8 sm:p-12 lg:border-l lg:border-t-0 lg:p-14"
          >
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Included from day one
            </h3>
            <ul className="mt-4 divide-y divide-white/10">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-3.5 py-3.5 text-[15px] text-slate-200"
                >
                  <Check
                    className="h-4 w-4 shrink-0 text-sky-300"
                    strokeWidth={2.5}
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
