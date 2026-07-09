import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mail,
  LifeBuoy,
  Building2,
  FileSearch,
  type LucideIcon,
} from "lucide-react";
import { Seo } from "@/shared/components/Seo";
import { LandingNavbar } from "@/features/landing/components/LandingNavbar";
import { Footer } from "@/features/landing/components/Footer";
import { BackToTop, ParallaxAccents } from "@/features/landing/components/scroll";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const CHANNELS: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: { label: string; href: string; external?: boolean };
}[] = [
  {
    icon: Building2,
    title: "Onboard your school",
    description:
      "The fastest route to a conversation: the guided application takes about ten minutes, and our team replies within a day.",
    action: { label: "Start an application", href: "/onboarding/apply" },
  },
  {
    icon: Mail,
    title: "General enquiries",
    description:
      "Partnerships, press, or anything that doesn't fit a form — write to us and a human will answer.",
    action: {
      label: "hello@ddai.work",
      href: "mailto:hello@ddai.work",
      external: true,
    },
  },
  {
    icon: LifeBuoy,
    title: "Support for partner schools",
    description:
      "Partner institutions get 24/7 priority support via chat, email, and phone — reach us through your admin dashboard for the fastest response.",
    action: {
      label: "support@ddai.work",
      href: "mailto:support@ddai.work",
      external: true,
    },
  },
  {
    icon: FileSearch,
    title: "Track an application",
    description:
      "Already applied? Check where your school's application is in the review process.",
    action: { label: "Check status", href: "/onboarding/status" },
  },
];

const CONTACT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact DeepDive",
  url: "https://ddai.work/contact",
  about: { "@id": "https://ddai.work/#organization" },
};

export function ContactPage() {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-background dark:bg-[#0b0e14] font-sans text-foreground antialiased selection:bg-primary/20">
      <Seo
        title="Contact us"
        description="Get in touch with DeepDive — start a school onboarding application, reach support, or write to the team. We reply within a day."
        path="/contact"
        jsonLd={CONTACT_JSON_LD}
      />
      <LandingNavbar />

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <ParallaxAccents />
          <div className="relative mx-auto max-w-[1180px] px-4 pb-20 pt-16 md:pt-24 xl:px-0">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.span
                variants={fadeUp}
                className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
              >
                <span className="h-px w-7 bg-primary/60" aria-hidden="true" />
                Contact
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl"
              >
                Talk to a person, not a queue.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg leading-relaxed text-muted-foreground"
              >
                Whether you're evaluating the platform for your school or
                already running your day on it, these are the quickest ways to
                reach us. We reply to every enquiry within one business day.
              </motion.p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {CHANNELS.map((channel) => (
                <motion.div
                  key={channel.title}
                  variants={fadeUp}
                  className="flex flex-col rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <channel.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-card-foreground">
                    {channel.title}
                  </h2>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {channel.description}
                  </p>
                  {channel.action.external ? (
                    <a
                      href={channel.action.href}
                      className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      <span className="underline-offset-4 group-hover:underline">
                        {channel.action.label}
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  ) : (
                    <Link
                      to={channel.action.href}
                      className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      <span className="underline-offset-4 group-hover:underline">
                        {channel.action.label}
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
