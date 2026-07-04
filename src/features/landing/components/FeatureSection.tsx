import { motion } from "framer-motion";
import {
  CalendarCheck2,
  Video,
  MessageSquareText,
  BarChart3,
  Building2,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { SpotlightCard } from "@/features/landing/components/interactive";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: "Smart Attendance",
    description:
      "Mark and track attendance in seconds with fast entry, date-range views, and per-student statistics.",
  },
  {
    icon: Video,
    title: "Lecture Recordings",
    description:
      "Securely record and upload class lectures, searchable and accessible to students anytime, anywhere.",
  },
  {
    icon: MessageSquareText,
    title: "AI Question Answering",
    description:
      "Students ask questions on course material and get instant answers grounded in class content.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Surveys",
    description:
      "Gather feedback through surveys and turn it into actionable insights on a unified dashboard.",
  },
  {
    icon: Building2,
    title: "Guided School Onboarding",
    description:
      "A step-by-step application takes your institution from first contact to fully live in days, not months.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Security",
    description:
      "Granular access control ensures admins, teachers, and students each see exactly what they should.",
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="w-full scroll-mt-24 bg-background py-24">
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="Platform"
          title="Everything you need to run your school"
          subtitle="Empower educators, students, and administrators with a comprehensive suite of tools designed for modern learning environments."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.div key={feature.title} variants={fadeUp} className="h-full">
              <SpotlightCard className="h-full rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex h-full flex-col p-7">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary/50 text-primary transition-colors duration-300 group-hover:border-primary/25 group-hover:bg-primary/10">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-lg font-semibold text-card-foreground">
                    {feature.title}
                    <ArrowUpRight className="h-4 w-4 -translate-x-1 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
