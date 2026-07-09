import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  Video,
  MessageCircleQuestion,
  BarChart3,
  ShieldCheck,
  HeartHandshake,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { Seo } from "@/shared/components/Seo";
import { LandingNavbar } from "@/features/landing/components/LandingNavbar";
import { Footer } from "@/features/landing/components/Footer";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { CountUp } from "@/features/landing/components/interactive";
import { BackToTop, ParallaxAccents } from "@/features/landing/components/scroll";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const MODULES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CalendarCheck2,
    title: "Attendance",
    description:
      "A full class register marked in under a minute, with per-student statistics, leave, and holiday management built in.",
  },
  {
    icon: Video,
    title: "Lecture recordings",
    description:
      "Every class recorded, uploaded securely, and searchable — students can revisit any lesson the same evening.",
  },
  {
    icon: MessageCircleQuestion,
    title: "AI study assistant",
    description:
      "Questions answered from the school's own recordings and material, with references to the exact class and chapter.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Attendance trends, enrollment, engagement, and survey feedback in real time — not at the end of term.",
  },
];

const VALUES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: HeartHandshake,
    title: "Schools first",
    description:
      "We build for the staff room, not the boardroom. Every feature starts with a real routine — a register, a doubt, a report — and makes it faster.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by default",
    description:
      "Student data belongs to schools. Role-based access is default-deny, and every account sees exactly what its role needs — nothing more.",
  },
  {
    icon: Lightbulb,
    title: "AI that stays grounded",
    description:
      "Our AI answers only from a school's own lectures and material, and always shows its source. No hallucinated homework help.",
  },
];

const STATS = [
  { label: "Partner schools", value: 1200, suffix: "+", decimals: 0 },
  { label: "Active teachers", value: 640, suffix: "+", decimals: 0 },
  { label: "Lectures preserved", value: 48000, suffix: "+", decimals: 0 },
];

const ABOUT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About DeepDive",
  url: "https://ddai.work/about",
  about: { "@id": "https://ddai.work/#organization" },
};

export function AboutPage() {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-background dark:bg-[#0b0e14] font-sans text-foreground antialiased selection:bg-primary/20">
      <Seo
        title="About us"
        description="DeepDive builds the platform Indian schools run their day on — attendance, lecture recordings, grounded AI Q&A, and real-time analytics. Learn about our mission and values."
        path="/about"
        jsonLd={ABOUT_JSON_LD}
      />
      <LandingNavbar />

      <main className="pt-16">
        {/* Intro */}
        <section className="relative overflow-hidden">
          <ParallaxAccents />
          <div className="relative mx-auto max-w-[1180px] px-4 pb-16 pt-16 md:pt-24 xl:px-0">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-3xl"
            >
              <motion.span
                variants={fadeUp}
                className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
              >
                <span className="h-px w-7 bg-primary/60" aria-hidden="true" />
                About DeepDive
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl"
              >
                Built so the school day runs itself.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg leading-relaxed text-muted-foreground"
              >
                DeepDive started with a simple observation: teachers spend the
                best hours of their day on registers, records, and repeated
                doubts. We build one platform that takes that work off their
                hands — attendance in seconds, every lecture preserved and
                searchable, AI answers grounded in the school's own classes,
                and analytics the staff room can act on.
              </motion.p>
              <motion.p
                variants={fadeUp}
                className="mt-4 text-base leading-relaxed text-muted-foreground"
              >
                Today, schools across India run their day on DeepDive — from
                the morning register to the evening revision session.
              </motion.p>
            </motion.div>

            {/* Numbers */}
            <motion.dl
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-14 grid grid-cols-1 gap-6 border-t border-border pt-10 sm:grid-cols-3"
            >
              {STATS.map((stat) => (
                <motion.div key={stat.label} variants={fadeUp}>
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
                </motion.div>
              ))}
            </motion.dl>
          </div>
        </section>

        {/* What we build */}
        <section className="w-full border-t border-border bg-secondary/30 py-16 sm:py-20">
          <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
            <SectionHeading
              eyebrow="What we build"
              title="Four modules, one source of truth"
              subtitle="Everything shares one login and one database, so no one re-enters data and nothing falls between systems."
            />
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {MODULES.map((module) => (
                <motion.div
                  key={module.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <module.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-card-foreground">
                      {module.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="relative w-full overflow-hidden py-16 sm:py-20">
          <ParallaxAccents flip />
          <div className="relative mx-auto max-w-[1180px] px-4 xl:px-0">
            <SectionHeading
              eyebrow="How we work"
              title="The principles behind the product"
            />
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-3"
            >
              {VALUES.map((value) => (
                <motion.div key={value.title} variants={fadeUp}>
                  <value.icon
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

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
                Onboard your school
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/contact"
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline"
              >
                Talk to the team →
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
