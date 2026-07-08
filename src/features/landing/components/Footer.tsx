import { Link } from "react-router-dom";
import { Linkedin, Twitter, Instagram, Mail, ArrowUpRight } from "lucide-react";

const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "For every role", href: "#roles" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Analytics", href: "#growth" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Onboard your school", href: "/onboarding/apply" },
      { label: "Track your application", href: "/onboarding/status" },
      { label: "Log in", href: "/login" },
      { label: "Create an account", href: "/register" },
    ],
  },
];

const SOCIALS = [
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Mail, label: "Email", href: "mailto:hello@deepdiveconsulting.in" },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background">

      <div className="mx-auto max-w-[1180px] px-4 py-14 xl:px-0">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <img
              src="/logo.png"
              alt="DeepDive Consulting"
              className="mb-4 h-8 object-contain"
            />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Transforming education with intelligent tools for the modern
              school — attendance, recordings, AI Q&A, and analytics in one
              secure platform.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border transition-all hover:text-primary hover:shadow-md hover:ring-primary/30"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h4 className="mb-4 font-semibold text-foreground">
                {group.heading}
              </h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="transition hover:text-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="transition hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <div className="text-sm text-muted-foreground/60">
            © {new Date().getFullYear()} DeepDive Consulting, Inc. All rights
            reserved.
          </div>
          <Link
            to="/onboarding/apply"
            className="group inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            <span className="underline-offset-4 group-hover:underline">
              Register your school
            </span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
