import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Seo } from "@/shared/components/Seo";
import logoImg from "@/public/logo.png";

/**
 * Privacy Policy.
 *
 * NOTE: The copy below is a structured placeholder so the "Privacy" link
 * resolves to a real, readable page. Replace the section text with the
 * wording approved by your legal team before launch.
 */

const LAST_UPDATED = "July 9, 2026";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. What we collect",
    body: "We collect the information a school provides while onboarding (institution details, contact information, registration documents), account details for admins, teachers, students, and parents (name, email, class and roll number where applicable), and the content schools create on the platform — attendance records, lecture recordings, questions, and survey responses.",
  },
  {
    heading: "2. How we use it",
    body: "Data is used solely to run the platform: marking and reporting attendance, storing and searching lecture recordings, answering student questions grounded in the school's own material, and showing analytics to authorized staff. We do not sell personal data or use student data for advertising.",
  },
  {
    heading: "3. Who controls the data",
    body: "Schools act as the data controllers for their students; DeepDive processes that data on their behalf. Parents and students can direct questions about their records to their school administrator.",
  },
  {
    heading: "4. Access and roles",
    body: "Access is role-based and default-deny. Administrators, teachers, students, and parents each see only what their role requires — a parent's account, for example, is scoped to their own child.",
  },
  {
    heading: "5. Security",
    body: "We use encryption in transit and at rest, role-based access control, audit logging, and secure cloud infrastructure. Access to production data by our staff is restricted and logged.",
  },
  {
    heading: "6. Retention and deletion",
    body: "Data is retained while a school remains a partner institution. When a school leaves the platform, its data is exported on request and then deleted from our systems within a defined window.",
  },
  {
    heading: "7. Cookies and analytics",
    body: "We use only the cookies needed to keep you signed in and the minimal analytics needed to keep the service reliable. We do not use third-party advertising trackers.",
  },
  {
    heading: "8. Contact",
    body: "Questions about this policy can be sent to hello@ddai.work or raised with your school administrator.",
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Seo
        title="Privacy Policy"
        description="How DeepDive collects, uses, and protects school and student data — role-based access, encryption, and schools as data controllers."
        path="/privacy"
      />
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="DeepDive" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Privacy Policy
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
            to="/terms"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Read the Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </div>
  );
}
