import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const FAQS = [
  {
    question: "Is it easy to onboard my entire school?",
    answer:
      "Yes. Our team helps you import existing student and staff data, and most schools are up and running within a few days of approval.",
  },
  {
    question: "How secure is the platform?",
    answer:
      "We use enterprise-grade encryption, role-based access control, and secure cloud infrastructure so student and administrative data stays protected.",
  },
  {
    question: "Can parents access the platform?",
    answer:
      "Parents get their own secure logins to track attendance and grades and to access lecture recordings, so they stay involved in the learning process.",
  },
  {
    question: "How does the AI question answering work?",
    answer:
      "The AI is grounded in your school's own course material and lecture recordings. Students ask in natural language and get answers with references to the exact class and chapter.",
  },
  {
    question: "Do you offer customer support?",
    answer:
      "We offer 24/7 priority support for all partner institutions via chat, email, and phone.",
  },
];

export function QASection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="w-full scroll-mt-24 bg-background dark:bg-[#0b0e14] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-x-16 gap-y-4 px-4 lg:grid-cols-[2fr_3fr] xl:px-0">
        <div>
          <SectionHeading
            eyebrow="FAQ"
            title="Questions schools ask us"
            subtitle="The answers administrators usually want before starting an application."
          />
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="-mt-6 text-sm text-muted-foreground"
          >
            Something else on your mind?{" "}
            <Link
              // to="/onboarding/apply"
              to="/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Ask through your application
            </Link>{" "}
            — we reply within a day.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="divide-y divide-border border-y border-border"
        >
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div key={faq.question} variants={fadeUp}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`font-medium transition-colors ${
                      isOpen ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 ${
                      isOpen ? "text-primary" : "text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    <Plus className="h-5 w-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-xl pb-5 text-sm leading-relaxed text-muted-foreground">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
