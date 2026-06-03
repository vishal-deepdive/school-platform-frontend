import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "Is it easy to onboard my entire school?",
    answer: "Absolutely! We provide a seamless onboarding process. Our team will help you import your existing student and staff data, and you can be up and running within a few days."
  },
  {
    question: "How secure is the platform?",
    answer: "Security is our top priority. We use enterprise-grade encryption, role-based access control, and secure cloud infrastructure to ensure that student and administrative data is always protected."
  },
  {
    question: "Can parents access the platform?",
    answer: "Yes, parents can have their own secure logins to track their child's attendance, grades, and access lecture recordings to help them stay involved in the learning process."
  },
  {
    question: "Do you offer customer support?",
    answer: "We offer 24/7 priority customer support for all our partner institutions via chat, email, and phone."
  }
]

export function QASection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="w-full bg-white py-24">
      <div className="mx-auto max-w-[800px] px-4 md:px-0">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-slate-600"
          >
            Everything you need to know about the product and billing.
          </motion.p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between bg-slate-50 px-6 py-4 text-left transition hover:bg-slate-100 focus:outline-none"
                >
                  <span className="font-medium text-slate-900">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-4 pt-2 text-slate-600 border-t border-slate-100 bg-white">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
