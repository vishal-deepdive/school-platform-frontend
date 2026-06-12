import { motion } from "framer-motion";
import { School, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export function OnboardingSection() {
  return (
    <section
      id="onboard"
      className="mx-auto w-full max-w-[1180px] px-4 py-24 md:px-0"
    >
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-16 sm:px-12 sm:py-24 lg:px-16 md:flex md:items-center md:gap-12">
        {/* Background gradient effects */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 md:w-[55%]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="rounded-full bg-primary/20 p-2 text-primary">
              <School className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium uppercase tracking-wider text-primary">
              Partner With Us
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Bring your school into the future.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-xl text-lg leading-8 text-slate-300"
          >
            Streamline administration, boost student engagement, and get
            real-time analytics. Join the network of modern institutions
            transforming education today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center gap-4"
          >
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900 group hover:scale-105"
            >
              Onboard New School
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="relative z-10 mt-12 md:mt-0 md:w-[45%]"
        >
          <div className="rounded-3xl bg-white/5 p-8 backdrop-blur-md border border-white/10 shadow-2xl">
            <h3 className="text-xl font-medium text-white mb-6">
              What you get out of the box
            </h3>
            <ul className="space-y-5">
              {[
                "Complete student management system",
                "Real-time attendance tracking",
                "Automated fee collection & invoicing",
                "Parent-teacher communication portal",
              ].map((feature, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-4 text-slate-200"
                >
                  <div className="flex-shrink-0 rounded-full bg-primary/20 p-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-base">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
