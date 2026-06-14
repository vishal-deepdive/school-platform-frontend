import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const FAQS = [
  {
    question: "Is it easy to onboard my entire school?",
    answer:
      "Absolutely! We provide a seamless onboarding process. Our team will help you import your existing student and staff data, and you can be up and running within a few days.",
  },
  {
    question: "How secure is the platform?",
    answer:
      "Security is our top priority. We use enterprise-grade encryption, role-based access control, and secure cloud infrastructure to ensure that student and administrative data is always protected.",
  },
  {
    question: "Can parents access the platform?",
    answer:
      "Yes, parents can have their own secure logins to track their child's attendance, grades, and access lecture recordings to help them stay involved in the learning process.",
  },
  {
    question: "How does the AI question answering work?",
    answer:
      "Our AI is grounded in your school's own course material and lecture recordings. Students ask questions in natural language and receive accurate answers with references to the exact class and chapter.",
  },
  {
    question: "Do you offer customer support?",
    answer:
      "We offer 24/7 priority customer support for all our partner institutions via chat, email, and phone.",
  },
];

export function QASection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="w-full scroll-mt-24 bg-background py-24">
      <div className="mx-auto max-w-[800px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          subtitle="Everything you need to know about the platform and onboarding."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="space-y-4"
        >
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                variants={fadeUp}
                className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
                  isOpen
                    ? "border-primary/30 shadow-md shadow-primary/5"
                    : "border-border"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 bg-card px-6 py-5 text-left transition hover:bg-accent hover:text-accent-foreground focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-card-foreground">
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`shrink-0 rounded-full p-1 ${
                      isOpen
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="border-t border-border/50 bg-card px-6 pb-5 pt-4 leading-relaxed text-muted-foreground">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10 text-center text-sm text-muted-foreground"
        >
          Still have questions?{" "}
          <Link
            to="/onboarding/apply"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Reach out through your application
          </Link>{" "}
          and our team will get back to you within a day.
        </motion.p>
      </div>
    </section>
  );
}
