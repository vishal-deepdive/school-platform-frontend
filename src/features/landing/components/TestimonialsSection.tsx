import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

const TESTIMONIALS = [
  {
    quote:
      "DeepDive cut our daily attendance routine from forty minutes to under five. The analytics dashboard has become the first thing I open every morning.",
    name: "Anita Sharma",
    role: "Principal, Greenfield Academy",
    initials: "AS",
    gradient: "from-primary to-sky-500",
  },
  {
    quote:
      "Onboarding was remarkably smooth — we submitted our application on a Monday and were running live classes on the platform by the end of the week.",
    name: "Rajesh Kumar",
    role: "Administrator, Sunrise Public School",
    initials: "RK",
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    quote:
      "My students use the AI Q&A to revise from my recorded lectures. Doubt-solving no longer waits for the next class — it happens the same evening.",
    name: "Meera Iyer",
    role: "Science Teacher, Lakeview High",
    initials: "MI",
    gradient: "from-violet-500 to-primary",
  },
];

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="w-full scroll-mt-24 border-t border-border bg-secondary/30 py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 xl:px-0">
        <SectionHeading
          eyebrow="Testimonials"
          title="Loved by educators and administrators"
          subtitle="Hear from the schools already transforming the way they teach, track, and grow with DeepDive."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {TESTIMONIALS.map((testimonial) => (
            <motion.figure
              key={testimonial.name}
              variants={fadeUp}
              className="group relative flex flex-col rounded-3xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5"
            >
              <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/10 transition-colors duration-300 group-hover:text-primary/20" />

              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                “{testimonial.quote}”
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.gradient} text-sm font-semibold text-white shadow-md`}
                >
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
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
