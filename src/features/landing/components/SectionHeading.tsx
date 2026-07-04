import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  dark = false,
}: SectionHeadingProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto mb-16 max-w-2xl text-center"
    >
      <motion.span
        variants={fadeUp}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest ${
          dark
            ? "bg-white/10 text-sky-300 ring-1 ring-white/15"
            : "bg-primary/10 text-primary ring-1 ring-primary/15"
        }`}
      >
        {eyebrow}
      </motion.span>
      <motion.h2
        variants={fadeUp}
        className={`mt-5 text-3xl font-bold tracking-tight md:text-[2.6rem] md:leading-[1.15] ${
          dark ? "text-white" : "text-foreground"
        }`}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className={`mt-4 text-lg leading-relaxed ${
            dark ? "text-slate-300" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
