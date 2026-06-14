import { motion } from "framer-motion";
import { FileText, MailCheck, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import {
  fadeUp,
  staggerContainer,
  EASE_OUT_EXPO,
} from "@/features/landing/animations";

const STEPS = [
  {
    icon: FileText,
    step: "01",
    title: "Apply Online",
    description:
      "Fill out our guided application with your school's details, classes, and documents. It takes less than ten minutes.",
  },
  {
    icon: MailCheck,
    step: "02",
    title: "Verify & Review",
    description:
      "Confirm your email with a one-time code while our team reviews your application — usually within two business days.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Go Live",
    description:
      "Admin accounts are provisioned and your staff onboarded. Attendance, recordings, and AI Q&A from day one.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="w-full scroll-mt-24 border-t border-border bg-secondary/30 py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="Onboarding"
          title="From application to live in three steps"
          subtitle="No lengthy contracts, no complicated migrations. Our team guides your school through every step of the journey."
        />

        <div className="relative">
          {/* Connector line (desktop) */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 0.3 }}
            className="absolute left-[16%] right-[16%] top-10 hidden h-0.5 origin-left bg-gradient-to-r from-primary/60 via-sky-400/60 to-cyan-400/60 lg:block"
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 gap-10 lg:grid-cols-3"
          >
            {STEPS.map((step) => (
              <motion.div
                key={step.step}
                variants={fadeUp}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-card shadow-lg shadow-black/5 ring-1 ring-border">
                  <step.icon className="h-8 w-8 text-primary" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-500 text-[11px] font-bold text-white shadow-md">
                    {step.step.slice(-1)}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                  {step.title}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE_OUT_EXPO }}
          className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/onboarding/apply"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          >
            Start Your Application
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/onboarding/status"
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline"
          >
            Already applied? Track your application
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
