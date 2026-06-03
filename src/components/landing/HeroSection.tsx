import { motion } from "framer-motion"
import { ShieldCheck, ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    <div className="text-sm text-slate-500">{label}</div>
  </div>
)

function MiniBars() {
  return (
    <div className="mt-6 flex h-36 items-end gap-4 rounded-xl bg-gradient-to-b from-primary/5 to-white p-4">
      {[18, 48, 72, 96].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0, opacity: 0.6 }}
          whileInView={{ height: h }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
          className="w-10 rounded-xl bg-gradient-to-t from-primary/30 to-primary/60 shadow-inner"
        />
      ))}
    </div>
  )
}

function Planet() {
  return (
    <motion.svg
      initial={{ rotate: -8 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 2, type: "spring" }}
      width="220"
      height="220"
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.5)" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="56" fill="url(#grad)" opacity="0.95" />
      <circle cx="94" cy="98" r="10" fill="white" opacity="0.45" />
      <circle cx="132" cy="126" r="8" fill="white" opacity="0.35" />
      <motion.ellipse
        cx="110" cy="110" rx="100" ry="34" stroke="white" strokeOpacity="0.6" fill="none"
        animate={{ strokeDashoffset: [200, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} strokeDasharray="200 200"
      />
      <motion.circle cx="210" cy="110" r="4" fill="white" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.2, repeat: Infinity }} />
    </motion.svg>
  )
}

export function HeroSection() {
  return (
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-6 px-4 pb-14 pt-10 md:grid-cols-2 md:px-0">
      {/* Left: headline */}
      <div className="flex flex-col justify-center space-y-8 pr-2">
        <div>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.05] tracking-tight text-slate-900">
            Manage your school
            <br />
            with precision.
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Join over a thousand institutions who choose <span className="font-medium text-slate-900">DeepDive Consulting</span> for fast, secure, and smart school management.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/onboarding/apply"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50"
          >
            Start Free Trial <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-2 md:max-w-sm">
          <Stat label="Active Students" value="150k+" />
          <Stat label="Schools Onboarded" value="1,200+" />
        </div>

        <div className="mt-6 flex items-center gap-8 opacity-70">
          <span className="text-xs text-slate-500">TRUSTED BY TOP INSTITUTIONS</span>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="font-semibold text-sm">Delhi Public School</span>
            <span className="font-semibold text-sm">KVS</span>
          </div>
        </div>
      </div>

      {/* Right: animated card grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-10 md:mt-0">
        {/* Secure card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative col-span-1 overflow-hidden rounded-xl bg-gradient-to-b from-primary to-primary/80 p-6 text-primary-foreground shadow-lg"
        >
          <div className="absolute inset-0">
            <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="rg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <rect width="400" height="400" fill="url(#rg)" />
              {[...Array(12)].map((_, i) => (
                <circle key={i} cx="200" cy="200" r={20 + i * 14} fill="none" stroke="currentColor" strokeOpacity="0.12" />
              ))}
            </svg>
          </div>

          <div className="relative flex h-full flex-col justify-between min-h-[220px]">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-foreground/20 p-2 ring-1 ring-white/10 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xs uppercase tracking-wider text-white/80">Extra Secure</span>
            </div>
            <div className="mt-6 text-xl leading-snug text-white/95">
              Role-based access
              <br /> keeps data safe
            </div>
            <motion.div
              className="absolute right-6 top-6 h-12 w-12 rounded-full bg-white/20"
              animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0.35)", "0 0 0 16px rgba(255,255,255,0)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Global/Reach card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative col-span-1 overflow-hidden rounded-xl bg-gradient-to-b from-primary/80 to-primary/60 p-6 text-white shadow-lg min-h-[220px]"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 opacity-70">
            <Planet />
          </div>
          <div className="relative mt-24 text-sm text-white/90">Platform Reach</div>
          <div className="text-xl font-medium leading-snug">
            Connect
            <br /> everywhere seamlessly
          </div>
        </motion.div>

        {/* Growth card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="col-span-1 md:col-span-2 rounded-xl bg-white p-6 text-slate-800 shadow-lg ring-1 ring-slate-200"
        >
          <div className="text-sm text-slate-500">Student Attendance Rate</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">96.4% <span className="text-sm font-medium text-slate-400 align-middle">Avg</span></div>
          <div className="mt-1 text-xs text-primary">↑ 2.1% this month</div>
          <MiniBars />
        </motion.div>
      </div>
    </div>
  )
}
