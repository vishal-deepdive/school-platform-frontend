import { Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-slate-900 p-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">DeepDive</h1>
              <p className="text-slate-400 text-sm">School Platform</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            AI-Powered School Management Platform
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Face recognition attendance, lecture transcription, textbook Q&A, and intelligent
            survey analytics — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Face Recognition', desc: 'Automated attendance' },
              { label: 'Lecture AI', desc: 'Audio → study materials' },
              { label: 'RAG Assistant', desc: 'Textbook Q&A' },
              { label: 'Survey Analytics', desc: 'AI feedback analysis' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-slate-800 p-4">
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">DeepDive School Platform</span>
        </div>
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
