import { Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'

export function AuthLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left Panel - Hero / Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-slate-950 p-2 text-white h-full">
        {/* Abstract background elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-violet-600/20 blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 shadow-lg shadow-indigo-500/20 backdrop-blur-md border border-indigo-500/30"
            >
              <GraduationCap className="h-6 w-6 text-indigo-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                DeepDive
              </h1>
              <p className="text-indigo-400/80 text-sm font-medium">School Platform</p>
            </motion.div>
          </div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl font-extrabold mb-6 leading-tight tracking-tight text-white"
          >
            AI-Powered School <br/> Management Platform
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-slate-400 text-lg leading-relaxed mb-12"
          >
            Face recognition attendance, lecture transcription, textbook Q&A, and intelligent
            survey analytics — all in one place.
          </motion.p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Face Recognition', desc: 'Automated attendance', delay: 0.6 },
              { label: 'Lecture AI', desc: 'Audio → study materials', delay: 0.7 },
              { label: 'RAG Assistant', desc: 'Textbook Q&A', delay: 0.8 },
              { label: 'Survey Analytics', desc: 'AI feedback analysis', delay: 0.9 },
            ].map((f) => (
              <motion.div 
                key={f.label} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: f.delay, duration: 0.5 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.06] hover:border-white/[0.1]"
              >
                <p className="text-sm font-semibold text-white mb-1.5">{f.label}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex w-full lg:w-1/2 flex-col relative h-full overflow-y-auto">
        <div className="flex-1 min-h-[2rem]" />
        <div className="w-full max-w-lg mx-auto px-6 shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-10 lg:hidden justify-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">DeepDive</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full bg-white rounded-3xl sm:shadow-xl sm:shadow-indigo-100/50 sm:border border-gray-100 p-8 sm:p-10 mb-12"
          >
            <Outlet />
          </motion.div>
        </div>
        <div className="flex-1 min-h-[2rem]" />
      </div>
    </div>
  )
}
