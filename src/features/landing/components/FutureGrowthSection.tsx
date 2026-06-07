import { motion } from "framer-motion";
import { TrendingUp, Users, Activity } from "lucide-react";

export function FutureGrowthSection() {
  return (
    <section
      id="growth"
      className="w-full bg-[#F8FAFC] py-24 border-t border-slate-200"
    >
      <div className="mx-auto max-w-[1180px] px-4 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8 pr-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Visualize Future Growth
              </h2>
              <p className="mt-4 text-slate-600 text-lg">
                Gain actionable insights into your institution's performance.
                Predict student success and streamline administrative efficiency
                with beautiful, real-time analytics.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <div className="flex gap-4">
                <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Predictive Analytics
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Forecast student enrollment trends and resource needs months
                    in advance.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Engagement Metrics
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Track classroom participation and interactive learning
                    success rates.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Real-time Activity
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Monitor live attendance and daily active usage across your
                    entire platform.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Demo Chart Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 50 }}
            className="relative"
          >
            <div className="rounded-2xl p-2 bg-white shadow-xl ring-1 ring-slate-900/5">
              <img
                src="/images/demo-chart.png"
                alt="Demo Analytics Dashboard"
                className="w-full h-auto rounded-xl object-cover"
              />
            </div>

            {/* Floating accent card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg ring-1 ring-slate-200 hidden md:flex items-center gap-4"
            >
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">
                  Monthly Growth
                </div>
                <div className="text-lg font-bold text-slate-900">+14.2%</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
