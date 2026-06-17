import { useEffect, useRef } from "react";
import { motion, animate, useInView } from "framer-motion";
import {
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  fadeUp,
  staggerContainer,
  wordReveal,
  EASE_OUT_EXPO,
} from "@/features/landing/animations";

/* ── Animated number that counts up when scrolled into view ─────────────── */
function CountUp({
  to,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (value) => {
        if (ref.current) {
          ref.current.textContent =
            decimals > 0
              ? value.toFixed(decimals) + suffix
              : Math.round(value).toLocaleString() + suffix;
        }
      },
    });
    return () => controls.stop();
  }, [inView, to, suffix, decimals]);

  return <span ref={ref}>0{suffix}</span>;
}

const STATS = [
  { label: "Active Students", value: 150, suffix: "k+", decimals: 0 },
  { label: "Schools Onboarded", value: 1200, suffix: "+", decimals: 0 },
  { label: "Platform Uptime", value: 99.9, suffix: "%", decimals: 1 },
];

const TRUSTED_BY = [
  "Delhi Public School",
  "Kendriya Vidyalaya",
  "Ryan International",
  "DAV Public School",
  "St. Xavier's",
  "Army Public School",
];

/* ── Soft animated aurora blobs behind the hero ─────────────────────────── */
function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid-slate absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 right-[5%] h-[380px] w-[380px] rounded-full bg-sky-400/15 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-[35%] h-[300px] w-[300px] rounded-full bg-cyan-300/10 blur-3xl"
      />
    </div>
  );
}

/* ── Bento: secure card ──────────────────────────────────────────────────── */
function SecureCard() {
  return (
    <motion.div
      variants={fadeUp}
      className="relative col-span-1 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-sky-700 p-6 text-white shadow-xl shadow-primary/20"
    >
      <div className="absolute inset-0">
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          {[...Array(10)].map((_, i) => (
            <circle
              key={i}
              cx="200"
              cy="200"
              r={26 + i * 18}
              fill="none"
              stroke="white"
              strokeOpacity="0.14"
            />
          ))}
        </svg>
      </div>

      <div className="relative flex min-h-[220px] flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/15 p-2 ring-1 ring-white/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
            Enterprise Secure
          </span>
        </div>
        <div className="mt-6 text-xl leading-snug text-white/95">
          Role-based access keeps every record safe.
        </div>
        <motion.div
          className="absolute right-2 top-2 h-12 w-12 rounded-full bg-white/15"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(255,255,255,0.35)",
              "0 0 0 18px rgba(255,255,255,0)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}

/* ── Bento: AI assistant chat card ───────────────────────────────────────── */
function AIChatCard() {
  return (
    <motion.div
      variants={fadeUp}
      className="relative col-span-1 flex min-h-[220px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-600 p-6 text-white shadow-xl shadow-sky-500/20"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white/15 p-2 ring-1 ring-white/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
          AI Assistant
        </span>
      </div>

      <div className="mt-5 flex flex-1 flex-col justify-end gap-3">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
          className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-4 py-2.5 text-sm ring-1 ring-white/15"
        >
          When was photosynthesis covered?
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.6, duration: 0.4, ease: "easeOut" }}
          className="mr-auto max-w-[90%] rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm text-card-foreground shadow-md"
        >
          Class 7 Science — Chapter 4, recorded lecture from May 12.
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Bento: attendance analytics card ────────────────────────────────────── */
function AttendanceCard() {
  const bars = [62, 78, 70, 88, 96];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <motion.div
      variants={fadeUp}
      className="col-span-1 rounded-3xl bg-card p-6 text-card-foreground shadow-xl shadow-black/5 ring-1 ring-border md:col-span-2"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            Student Attendance Rate
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight">
            <CountUp to={96.4} suffix="%" decimals={1} />{" "}
            <span className="align-middle text-sm font-medium text-muted-foreground">
              Avg
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-600">
            ↑ 2.1% this month
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-6 flex h-32 items-end gap-3 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent p-4">
        {bars.map((height, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${height}%` }}
              viewport={{ once: true }}
              transition={{
                delay: 0.4 + i * 0.12,
                duration: 0.7,
                ease: EASE_OUT_EXPO,
              }}
              className="w-full rounded-lg bg-gradient-to-t from-primary/40 to-primary shadow-sm"
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {days[i]}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  const headlineWords = "The smarter way to run your school.".split(" ");

  return (
    <section className="relative overflow-hidden">
      <AuroraBackground />

      <div className="relative mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-12 px-4 pb-20 pt-14 md:grid-cols-2 md:gap-8 md:pt-20 xl:px-0">
        {/* Left: headline */}
        <div className="flex flex-col justify-start space-y-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-primary/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered School Management
            </motion.span> */}

            <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-6xl">
              {headlineWords.map((word, i) => (
                <motion.span
                  key={i}
                  variants={wordReveal}
                  className="mr-[0.28em] inline-block"
                >
                  {word === "smarter" ? (
                    <span className="bg-gradient-to-r from-primary via-sky-500 to-cyan-500 bg-clip-text text-transparent">
                      {word}
                    </span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              Attendance, lecture recordings, AI-powered Q&A, and real-time
              analytics — unified in one secure platform, so educators can focus
              on what matters most: teaching.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/onboarding/apply"
                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                Onboard Your School
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="#features"
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-7 py-3 text-sm font-semibold text-foreground/80 backdrop-blur transition-all hover:border-border/80 hover:bg-background"
              >
                Explore Features
                <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-10 grid max-w-md grid-cols-3 gap-6"
            >
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-semibold tracking-tight text-foreground">
                    <CountUp
                      to={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Right: animated bento grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <SecureCard />
          <AIChatCard />
          <AttendanceCard />

          {/* Floating approval toast */}
          <motion.div
            initial={{ opacity: 0, x: -24, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 2, duration: 0.5, ease: EASE_OUT_EXPO }}
            className="absolute -left-8 bottom-24 hidden animate-float items-center gap-3 rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border lg:flex"
          >
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                School Onboarded
              </div>
              <div className="text-xs text-muted-foreground">
                Application approved · just now
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Trusted-by marquee */}
      <div className="relative mx-auto w-full max-w-[1180px] px-4 pb-16 xl:px-0">
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
            <div className="flex w-max animate-marquee gap-14">
              {[...TRUSTED_BY, ...TRUSTED_BY].map((name, i) => (
                <span
                  key={i}
                  className="whitespace-nowrap text-base font-semibold text-muted-foreground/50"
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
