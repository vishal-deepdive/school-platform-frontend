import { motion } from "framer-motion";
import { ClipboardCheck, Mic, BrainCircuit, BarChart3 } from "lucide-react";

const features = [
  {
    icon: <ClipboardCheck className="h-6 w-6 text-primary" />,
    title: "Smart Attendance",
    description:
      "Mark and track attendance efficiently with facial recognition or fast manual entry.",
  },
  {
    icon: <Mic className="h-6 w-6 text-primary" />,
    title: "Lecture Recordings",
    description:
      "Securely record and upload class lectures. Accessible to students anytime, anywhere.",
  },
  {
    icon: <BrainCircuit className="h-6 w-6 text-primary" />,
    title: "AI Question Answering",
    description:
      "Students can ask questions based on course material and get AI-powered instant answers.",
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
    title: "Analytics & Surveys",
    description:
      "Gather feedback through surveys and view actionable insights on a unified dashboard.",
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="w-full bg-white py-24">
      <div className="mx-auto max-w-[1180px] px-4 md:px-0">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900"
          >
            Everything you need to run your school
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-slate-600 max-w-2xl mx-auto"
          >
            Empower educators, students, and administrators with a comprehensive
            suite of tools designed for modern learning environments.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.1 * index,
                type: "spring",
                stiffness: 100,
              }}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
