import { motion } from "framer-motion";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const FEATURED = {
  quote:
    "DeepDive cut our daily attendance routine from forty minutes to under five. The analytics dashboard has become the first thing I open every morning.",
  name: "Anita Sharma",
  role: "Principal, Greenfield Academy",
  initials: "AS",
};

const TESTIMONIALS = [
  {
    quote:
      "Onboarding was remarkably smooth — we applied on a Monday and were running classes on the platform by the end of the week.",
    name: "Rajesh Kumar",
    role: "Administrator, Sunrise Public School",
    initials: "RK",
  },
  {
    quote:
      "My students use the AI Q&A to revise from my recorded lectures. Doubt-solving no longer waits for the next class.",
    name: "Meera Iyer",
    role: "Science Teacher, Lakeview High",
    initials: "MI",
  },
  {
    quote:
      "Parents finally have a clear window into their child's progress. Attendance queries at the front office have dropped to nearly zero.",
    name: "Suresh Patel",
    role: "Vice Principal, Heritage School",
    initials: "SP",
  },
  {
    quote:
      "Role-based access gives me confidence that student records are safe. Setup for our 40 teachers took a single afternoon.",
    name: "Kavitha Nair",
    role: "IT Coordinator, Silver Oak Academy",
    initials: "KN",
  },
];

function Attribution({
  name,
  role,
  initials,
}: {
  name: string;
  role: string;
  initials: string;
}) {
  return (
    <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </span>
      <span>
        <span className="block text-sm font-semibold text-card-foreground">
          {name}
        </span>
        <span className="block text-xs text-muted-foreground">{role}</span>
      </span>
    </figcaption>
  );
}

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="w-full scroll-mt-24 border-t border-border bg-secondary/30 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="From the staff room"
          title="What schools say after a term with us"
          subtitle="Principals, teachers, and coordinators on what actually changed in their daily routine."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Featured quote */}
          <motion.figure
            variants={fadeUp}
            className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-8 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5 md:col-span-2 md:p-10"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-6 top-2 font-serif text-[7rem] leading-none text-primary/10"
            >
              &ldquo;
            </span>
            <blockquote className="relative pt-6 font-serif text-xl leading-relaxed text-foreground md:text-2xl md:leading-relaxed">
              {FEATURED.quote}
            </blockquote>
            <Attribution {...FEATURED} />
          </motion.figure>

          {TESTIMONIALS.map((t) => (
            <motion.figure
              key={t.name}
              variants={fadeUp}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <Attribution {...t} />
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
