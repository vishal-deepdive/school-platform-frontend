import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-[#F3F5F7] py-12">
      <div className="mx-auto max-w-[1180px] px-4 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="DeepDive Consulting" className="h-8 object-contain" />
            </div>
            <p className="text-sm text-slate-500">
              Transforming education with intelligent tools for the modern school.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#features" className="hover:text-primary transition">Features</a></li>
              <li><a href="#growth" className="hover:text-primary transition">Analytics</a></li>
              <li><a href="#" className="hover:text-primary transition">Integrations</a></li>
              <li><a href="#" className="hover:text-primary transition">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-primary transition">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition">Community</a></li>
              <li><a href="#" className="hover:text-primary transition">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-primary transition">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} DeepDive Consulting, Inc. All rights reserved.
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link to="/onboarding/apply" className="text-sm font-medium text-primary hover:underline">
              Register your school
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
