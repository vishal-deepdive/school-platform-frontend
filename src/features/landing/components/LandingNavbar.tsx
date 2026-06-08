import { Link } from "react-router-dom";

export function LandingNavbar() {
  return (
    <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-6 md:px-0">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="DeepDive Consulting"
          className="h-8 object-contain"
        />
      </div>
      <div className="hidden items-center gap-8 md:flex">
        {["Features", "Analytics", "Growth", "Onboard", "FAQ"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            {item === "Onboard" ? "Onboard School" : item}
          </a>
        ))}
      </div>
      <div className="hidden gap-3 md:flex">
        <Link
          to="/login"
          className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50"
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
