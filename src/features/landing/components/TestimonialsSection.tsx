import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { SectionHeading } from "@/features/landing/components/SectionHeading";

const TESTIMONIALS = [
  {
    quote:
      "DeepDive cut our daily attendance routine from forty minutes to under five. The analytics dashboard has become the first thing I open every morning.",
    name: "Anita Sharma",
    role: "Principal, Greenfield Academy",
    initials: "AS",
  },
  {
    quote:
      "Onboarding was remarkably smooth — we submitted our application on a Monday and were running live classes on the platform by the end of the week.",
    name: "Rajesh Kumar",
    role: "Administrator, Sunrise Public School",
    initials: "RK",
  },
  {
    quote:
      "My students use the AI Q&A to revise from my recorded lectures. Doubt-solving no longer waits for the next class — it happens the same evening.",
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
      "The role-based access gives me confidence that student records are safe. Setup for our 40 teachers took a single afternoon.",
    name: "Kavitha Nair",
    role: "IT Coordinator, Silver Oak Academy",
    initials: "KN",
  },
  {
    quote:
      "Survey insights helped us redesign our timetable within a term. Decisions that used to take months now take a staff meeting.",
    name: "Arjun Mehta",
    role: "Director, Bluebell International",
    initials: "AM",
  },
];

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
}) {
  return (
    <figure className="group relative flex w-[340px] shrink-0 flex-col rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 sm:w-[400px]">
      <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/10 transition-colors duration-300 group-hover:text-primary/20" />

      <div className="mb-4 flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>

      <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
        “{testimonial.quote}”
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/15">
          {testimonial.initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-card-foreground">
            {testimonial.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {testimonial.role}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: typeof TESTIMONIALS;
  reverse?: boolean;
}) {
  return (
    <div className="mask-fade-edges-x overflow-hidden">
      <div
        className={`flex w-max animate-marquee gap-6 py-2 hover:[animation-play-state:paused] ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
        style={{ animationDuration: "48s" }}
      >
        {[...items, ...items].map((testimonial, i) => (
          <TestimonialCard key={`${testimonial.name}-${i}`} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const firstRow = TESTIMONIALS.slice(0, 3);
  const secondRow = TESTIMONIALS.slice(3);

  return (
    <section
      id="testimonials"
      className="w-full scroll-mt-24 overflow-hidden border-t border-border bg-secondary/30 py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="Testimonials"
          title="Loved by educators and administrators"
          subtitle="Hear from the schools already transforming the way they teach, track, and grow with DeepDive."
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="space-y-6"
      >
        <MarqueeRow items={firstRow} />
        <MarqueeRow items={secondRow} reverse />
      </motion.div>
    </section>
  );
}
