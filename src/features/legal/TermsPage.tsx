import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import logoImg from "@/public/logo.png";

/**
 * Terms of Service.
 *
 * NOTE: The copy below is a structured placeholder so the "Terms & Conditions"
 * link resolves to a real, readable page. Replace the section text with the
 * wording approved by your legal team before launch.
 */

const LAST_UPDATED = "July 5, 2026";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Who can use DeepDive",
    body: "DeepDive is a school platform for students, parents, teachers, and school administrators. Student and teacher accounts are created through a school; parent accounts are linked to a student and activated after the school approves the request. You are responsible for keeping your login credentials confidential.",
  },
  {
    heading: "2. Accounts and accurate information",
    body: "When you register you agree to provide accurate details — including your name, school, and (for students) class and roll number — and to keep them up to date. Providing false information, or accessing an account that is not yours, may result in suspension.",
  },
  {
    heading: "3. Acceptable use",
    body: "Use DeepDive only for legitimate educational purposes. Do not attempt to disrupt the service, access data you are not authorized to see, or upload unlawful, harmful, or infringing content.",
  },
  {
    heading: "4. Student data and privacy",
    body: "We handle student and school data in line with our Privacy Policy and applicable law. Schools act as the data controllers for their students; DeepDive processes that data on their behalf to provide the service.",
  },
  {
    heading: "5. Content you submit",
    body: "You retain ownership of the content you upload. You grant your school and DeepDive the permissions needed to store, display, and process that content for the purpose of running the platform.",
  },
  {
    heading: "6. Availability and changes",
    body: "We work to keep DeepDive available and secure, but the service is provided on an \"as is\" basis. We may update features, and we may revise these terms — significant changes will be communicated through the platform.",
  },
  {
    heading: "7. Contact",
    body: "Questions about these terms can be directed to your school administrator or to the DeepDive support team.",
  },
];

export function TermsPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="DeepDive" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign up
          </Link>
        </div>

        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-base font-semibold text-foreground">
                {s.heading}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-border/60 pt-6">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
