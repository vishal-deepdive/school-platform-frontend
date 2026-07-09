import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  CalendarCheck2,
  Video,
  Users,
  MessageCircleQuestion,
  ClipboardCheck,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  fadeUp,
  staggerContainer,
  wordReveal,
  EASE_OUT_EXPO,
} from "@/features/landing/animations";
import { CountUp } from "@/features/landing/components/interactive";
import { DashboardPreview } from "@/features/landing/components/DashboardPreview";
import { SpotlightGrid } from "@/features/landing/components/SpotlightGrid";

const HEADLINE_WORDS = ["One", "platform", "to", "run", "your"];

const HIGHLIGHTS = ["Free guided onboarding", "Live in days", "24/7 support"];

/* Small register moments that drift around the product mockup — the school
   day happening in real time, not a static screenshot. Three fixed slots
   cycle through a larger pool of events so the day keeps moving. */
const MOMENT_SLOTS: { position: string; delay: number; duration: number }[] = [
  { position: "-left-5 top-12 2xl:-left-20", delay: 1.1, duration: 5.2 },
  { position: "-right-4 top-1/4 2xl:-right-20", delay: 1.35, duration: 6.1 },
  { position: "-left-3 bottom-16 2xl:-left-16", delay: 1.6, duration: 5.6 },
];

const MOMENT_POOL: { icon: LucideIcon; text: string }[] = [
  { icon: CalendarCheck2, text: "Class 8B register marked — 47s" },
  { icon: Video, text: "Physics — Light & Refraction uploaded" },
  { icon: Users, text: "Parent viewed Diya's progress" },
  { icon: MessageCircleQuestion, text: "AI answered a doubt from Friday's class" },
  { icon: ClipboardCheck, text: "Leave request approved — roll 23" },
  { icon: BookOpen, text: "Flashcards ready — Chemistry Ch. 4" },
];

/** Seconds each set of moments stays up before the next crossfades in. */
const MOMENT_CYCLE_MS = 5000;

const STATS = [
  { label: "Partner schools", value: 1200, suffix: "+", decimals: 0 },
  { label: "Active teachers", value: 640, suffix: "+", decimals: 0 },
  { label: "Avg. attendance", value: 96.4, suffix: "%", decimals: 1 },
  { label: "Lectures preserved", value: 48000, suffix: "+", decimals: 0 },
];

function MomentContent({
  moment,
}: {
  moment: (typeof MOMENT_POOL)[number];
}) {
  return (
    <motion.div
      key={moment.text}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
      className="flex items-center gap-2.5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <moment.icon className="h-3.5 w-3.5" />
      </span>
      <span className="whitespace-nowrap text-xs font-medium text-foreground/85">
        {moment.text}
      </span>
    </motion.div>
  );
}

function FloatingMoment({
  slot,
  moment,
}: {
  slot: (typeof MOMENT_SLOTS)[number];
  moment: (typeof MOMENT_POOL)[number];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: slot.delay,
        duration: 0.6,
        ease: EASE_OUT_EXPO,
      }}
      className={`absolute z-10 hidden lg:block ${slot.position}`}
      style={{ transform: "translateZ(60px)" }}
    >
      {/* Infinite bob lives on its own layer so it never fights the pill's
         layout animation (both would want the same transform otherwise). */}
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{
          delay: slot.delay + 0.6,
          duration: slot.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* The pill resizes smoothly as moments of different widths swap in. */}
        <motion.div
          layout
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className="rounded-xl border border-border bg-background/85 py-2.5 pl-2.5 pr-4 shadow-lg shadow-primary/5 backdrop-blur-md"
        >
          <AnimatePresence mode="wait" initial={false}>
            <MomentContent key={moment.text} moment={moment} />
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const mockupRef = useRef<HTMLDivElement>(null);

  // Scroll-linked perspective: the mockup settles flat as it scrolls in.
  const { scrollYProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "start 0.35"],
  });
  const scrollRotateX = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);

  // Pointer tilt layered on top of the scroll tilt (fine pointers only).
  const [finePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches,
  );
  const pointerRX = useSpring(0, { stiffness: 150, damping: 20, mass: 0.5 });
  const pointerRY = useSpring(0, { stiffness: 150, damping: 20, mass: 0.5 });
  const rotateX = useTransform(
    [scrollRotateX, pointerRX],
    ([scroll, pointer]: number[]) => scroll + pointer,
  );

  const onMockupPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!finePointer || reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    pointerRX.set(-py * 5);
    pointerRY.set(px * 6);
  };
  const onMockupPointerLeave = () => {
    pointerRX.set(0);
    pointerRY.set(0);
  };

  // The headline block hands focus to the mockup as the user scrolls away.
  const { scrollY } = useScroll();
  const copyOpacity = useTransform(scrollY, [0, 420], [1, 0.35]);
  const copyY = useTransform(scrollY, [0, 420], [0, -28]);

  // Rotate the floating moments through the pool: each tick shows the next
  // set of three, so the school day keeps happening.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setTick((t) => t + 1),
      MOMENT_CYCLE_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);
  const momentAt = (slotIndex: number) =>
    MOMENT_POOL[(tick * MOMENT_SLOTS.length + slotIndex) % MOMENT_POOL.length];
  const tickerMoment = MOMENT_POOL[tick % MOMENT_POOL.length];

  return (
    <section className="relative overflow-hidden bg-background dark:bg-[#0b0e14] pt-16">
      {/* Quiet, single-hue backdrop: a structured grid — the visual language of a
         register or timetable — fading into one soft brand glow. The register
         lines light up in brand blue under the cursor as it moves. */}
      <SpotlightGrid />

      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-16 text-center md:pt-24 xl:px-0">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          style={reduceMotion ? undefined : { opacity: copyOpacity, y: copyY }}
        >
          <motion.div variants={fadeUp} className="flex justify-center">
            <Link
              to="/onboarding/apply"
              className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] py-1.5 pl-2.5 pr-3 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now onboarding schools for the 2026–27 academic year
              <ArrowRight className="h-3 w-3 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

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
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
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

        {/* Product mockup with scroll-linked perspective + pointer tilt */}
        <div
          className="relative mt-14 [perspective:1400px] md:mt-16"
          onPointerMove={onMockupPointerMove}
          onPointerLeave={onMockupPointerLeave}
        >
          <div className="pointer-events-none absolute -inset-x-8 top-8 -bottom-8 rounded-[3rem] bg-primary/[0.07] blur-3xl" />
          <motion.div
            ref={mockupRef}
            style={{
              rotateX,
              rotateY: pointerRY,
              scale,
              transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: EASE_OUT_EXPO }}
            className="relative origin-top"
          >
            {MOMENT_SLOTS.map((slot, i) => (
              <FloatingMoment
                key={slot.position}
                slot={slot}
                moment={momentAt(i)}
              />
            ))}
            <DashboardPreview />
          </motion.div>
        </div>

        {/* Mobile stand-in for the floating moments: one compact ticker line */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5, ease: EASE_OUT_EXPO }}
          className="mt-6 flex justify-center lg:hidden"
        >
          <div className="rounded-xl border border-border bg-background/85 px-3 py-2 shadow-sm backdrop-blur-md">
            <AnimatePresence mode="wait" initial={false}>
              <MomentContent key={tickerMoment.text} moment={tickerMoment} />
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Stats band — the numbers a school actually asks about */}
      <div className="relative mx-auto w-full max-w-[1180px] px-4 py-16 xl:px-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Schools across India run their day on DeepDive
          </p>
          <dl className="grid grid-cols-2 gap-y-8 sm:grid-cols-4 sm:divide-x sm:divide-border/60">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-4 text-center">
                <dd className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  <CountUp
                    to={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </dd>
                <dt className="mt-1.5 text-xs font-medium text-muted-foreground">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}
