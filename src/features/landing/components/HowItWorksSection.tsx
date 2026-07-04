import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  MailCheck,
  Rocket,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import {
  fadeUp,
  staggerContainer,
  EASE_OUT_EXPO,
} from "@/features/landing/animations";

const STEP_DURATION_MS = 4500;

const STEPS = [
  {
    icon: FileText,
    step: "01",
    title: "Apply Online",
    duration: "~10 minutes",
    description:
      "Fill out our guided application with your school's details, classes, and documents. It takes less than ten minutes.",
    checklist: [
      "School profile & contact details",
      "Classes and sections setup",
      "Upload registration documents",
    ],
  },
  {
    icon: MailCheck,
    step: "02",
    title: "Verify & Review",
    duration: "~2 business days",
    description:
      "Confirm your email with a one-time code while our team reviews your application — usually within two business days.",
    checklist: [
      "One-time email verification",
      "Document review by our team",
      "Approval notification",
    ],
  },
  {
    icon: Rocket,
    step: "03",
    title: "Go Live",
    duration: "Day one",
    description:
      "Admin accounts are provisioned and your staff onboarded. Attendance, recordings, and AI Q&A from day one.",
    checklist: [
      "Admin accounts provisioned",
      "Staff & student onboarding",
      "Full platform access unlocked",
    ],
  },
];

export function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance through steps; pauses while the user hovers the stepper.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setActive((current) => (current + 1) % STEPS.length),
      STEP_DURATION_MS,
    );
    return () => clearInterval(id);
  }, [paused]);

  const activeStep = STEPS[active];

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

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2"
        >
          {/* Left: clickable step list */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col gap-4"
          >
            {STEPS.map((step, index) => {
              const isActive = index === active;
              return (
                <motion.button
                  key={step.step}
                  variants={fadeUp}
                  onClick={() => setActive(index)}
                  aria-pressed={isActive}
                  className={`relative overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 ${
                    isActive
                      ? "border-primary/30 bg-card shadow-lg shadow-primary/5"
                      : "border-border bg-card/50 hover:border-primary/20 hover:bg-card"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border bg-secondary/50 text-primary"
                      }`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3
                          className={`font-semibold transition-colors ${
                            isActive
                              ? "text-card-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="mr-2 text-xs font-bold text-primary/60">
                            {step.step}
                          </span>
                          {step.title}
                        </h3>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {step.duration}
                        </span>
                      </div>
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="overflow-hidden text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="block pt-2">
                              {step.description}
                            </span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Auto-advance progress bar */}
                  {isActive && (
                    <motion.div
                      key={`progress-${active}-${paused}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: paused ? 0 : 1 }}
                      transition={{
                        duration: paused ? 0 : STEP_DURATION_MS / 1000,
                        ease: "linear",
                      }}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Right: animated detail panel for the active step */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 lg:p-10"
          >
            <div className="bg-grid-slate absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]" />

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                className="relative"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <activeStep.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                      Step {activeStep.step}
                    </div>
                    <h3 className="text-2xl font-semibold text-card-foreground">
                      {activeStep.title}
                    </h3>
                  </div>
                </div>

                <ul className="space-y-4">
                  {activeStep.checklist.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.12, duration: 0.35 }}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3.5"
                    >
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-sm font-medium text-foreground/85">
                        {item}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            {/* Step dots */}
            <div className="relative mt-8 flex gap-2">
              {STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActive(index)}
                  aria-label={`Go to step ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === active
                      ? "w-8 bg-primary"
                      : "w-1.5 bg-border hover:bg-primary/40"
                  }`}
                />
              ))}
            </div>
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
            // to="/onboarding/apply"
            to="/"
            className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
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
