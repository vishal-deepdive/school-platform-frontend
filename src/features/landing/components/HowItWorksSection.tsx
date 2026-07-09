import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const STEPS = [
  {
    duration: "~10 minutes",
    title: "Apply online",
    description:
      "Fill out the guided application with your school's details, classes, and registration documents.",
    checklist: [
      "School profile & contact details",
      "Classes and sections setup",
      "Registration documents",
    ],
  },
  {
    duration: "~2 business days",
    title: "Verify & review",
    description:
      "Confirm your email with a one-time code while our team reviews the application and documents.",
    checklist: [
      "One-time email verification",
      "Document review by our team",
      "Approval notification",
    ],
  },
  {
    duration: "Day one",
    title: "Go live",
    description:
      "Admin accounts are provisioned and staff onboarded. Attendance, recordings, and AI Q&A from the first bell.",
    checklist: [
      "Admin accounts provisioned",
      "Staff & student onboarding",
      "Full platform access",
    ],
  },
];

export function HowItWorksSection() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  // The connector line between step markers draws itself as the timeline
  // scrolls into view — application, review, go-live, in reading order.
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.9", "start 0.35"],
  });
  const firstSegment = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const secondSegment = useTransform(scrollYProgress, [0.5, 1], [0, 1]);
  const segments = [firstSegment, secondSegment];

  return (
    <section
      id="how-it-works"
      className="w-full scroll-mt-24 border-t border-border bg-secondary/30 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="Onboarding"
          title="Application to live classes, in under a week"
          subtitle="No lengthy contracts, no complicated migrations. The whole process is measured in days — here is exactly how it goes."
        />

        <motion.ol
          ref={listRef}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-3"
        >
          {STEPS.map((step, index) => (
            <motion.li key={step.title} variants={fadeUp} className="relative">
              {/* Timeline marker: dot + connecting line that draws on scroll */}
              <div className="flex items-center gap-4" aria-hidden="true">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/15" />
                {index < STEPS.length - 1 && (
                  <span className="relative hidden h-px flex-1 bg-border lg:block">
                    <motion.span
                      style={{ scaleX: reduceMotion ? 1 : segments[index] }}
                      className="absolute inset-0 origin-left bg-primary/70"
                    />
                  </span>
                )}
              </div>

              <div className="mt-6 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {step.duration}
              </div>
              <h3 className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>

              <ul className="mt-5 space-y-2.5">
                {step.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-foreground/80"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      strokeWidth={2.5}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.li>
          ))}
        </motion.ol>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 flex flex-col items-start gap-4 border-t border-border pt-8 sm:flex-row sm:items-center"
        >
          <Link
            to="/onboarding/apply"
            className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          >
            Start your application
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
