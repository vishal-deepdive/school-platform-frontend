import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Mic,
  BrainCircuit,
  BarChart3,
  School,
  ShieldCheck,
} from "lucide-react";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Smart Attendance",
    description:
      "Mark and track attendance in seconds with fast entry, date-range views, and per-student statistics.",
    gradient: "from-primary to-sky-500",
  },
  {
    icon: Mic,
    title: "Lecture Recordings",
    description:
      "Securely record and upload class lectures, searchable and accessible to students anytime, anywhere.",
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    icon: BrainCircuit,
    title: "AI Question Answering",
    description:
      "Students ask questions on course material and get instant, AI-powered answers grounded in class content.",
    gradient: "from-violet-500 to-primary",
  },
  {
    icon: BarChart3,
    title: "Analytics & Surveys",
    description:
      "Gather feedback through surveys and turn it into actionable insights on a unified dashboard.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: School,
    title: "Guided School Onboarding",
    description:
      "A step-by-step application takes your institution from first contact to fully live in days, not months.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Security",
    description:
      "Granular access control ensures admins, teachers, and students each see exactly what they should.",
    gradient: "from-rose-500 to-pink-500",
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
            <motion.div
              key={feature.title}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
