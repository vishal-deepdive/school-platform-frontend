import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fadeUp,
  staggerContainer,
  wordReveal,
  EASE_OUT_EXPO,
} from "@/features/landing/animations";
import { DashboardPreview } from "@/features/landing/components/DashboardPreview";

const HEADLINE_WORDS = ["One", "platform", "to", "run", "your"];

const HIGHLIGHTS = ["Free guided onboarding", "Live in days", "24/7 support"];

const TRUSTED_BY = [
  "Delhi Public School",
  "Kendriya Vidyalaya",
  "Ryan International",
  "DAV Public School",
  "St. Xavier's",
  "Army Public School",
];

export function HeroSection() {
  const mockupRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "start 0.35"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);

  return (
    <section className="relative overflow-hidden bg-background dark:bg-[#030303] pt-16">
      {/* Quiet, single-hue backdrop: a structured grid — the visual language of a
         register or timetable — fading into one soft brand glow. Static by design;
         no rotating shapes to paint every frame. */}
      <div
        aria-hidden="true"
        className="mask-radial-fade pointer-events-none absolute inset-0 bg-grid-slate dark:bg-grid-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_-5%,hsl(var(--primary)/0.13),transparent_72%)]"
      />

      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-16 text-center md:pt-24 xl:px-0">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span
                key={i}
                variants={wordReveal}
                className="mr-[0.26em] inline-block"
              >
                {word}
              </motion.span>
            ))}
            <motion.span variants={wordReveal} className="inline-block">
              <span className="relative whitespace-nowrap text-primary">
                entire school.
                <svg
                  viewBox="0 0 220 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-2.5 w-full"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M3 9 C 60 3, 160 3, 217 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.9, duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </svg>
              </span>
            </motion.span>
          </h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            Attendance, lecture recordings, AI-powered Q&A, and real-time
            analytics — unified in one secure platform, so educators can focus
            on teaching.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/onboarding/apply"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            >
              Onboard Your School
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              Explore Features
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {HIGHLIGHTS.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                {item}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Product mockup with scroll-linked perspective */}
        <div className="relative mt-14 [perspective:1400px] md:mt-16">
          <div className="pointer-events-none absolute -inset-x-8 top-8 -bottom-8 rounded-[3rem] bg-primary/[0.07] blur-3xl" />
          <motion.div
            ref={mockupRef}
            style={{ rotateX, scale, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: EASE_OUT_EXPO }}
            className="relative origin-top"
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>

      {/* Trusted-by marquee */}
      <div className="relative mx-auto w-full max-w-[1180px] px-4 py-16 xl:px-0">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Trusted by leading institutions
          </p>
          <div className="mask-fade-edges-x overflow-hidden">
            <div className="flex w-max animate-marquee gap-14 hover:[animation-play-state:paused]">
              {[...TRUSTED_BY, ...TRUSTED_BY].map((name, i) => (
                <span
                  key={i}
                  className="whitespace-nowrap text-base font-semibold text-muted-foreground/50 transition-colors hover:text-foreground/70"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
