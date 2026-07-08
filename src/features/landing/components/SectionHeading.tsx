import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/features/landing/animations";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={`mb-14 max-w-2xl ${centered ? "mx-auto text-center" : ""}`}
    >
      <motion.span
        variants={fadeUp}
        className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary ${
          centered ? "justify-center" : ""
        }`}
      >
        <span className="h-px w-7 bg-primary/60" aria-hidden="true" />
        {eyebrow}
        {centered && <span className="h-px w-7 bg-primary/60" aria-hidden="true" />}
      </motion.span>
      <motion.h2
        variants={fadeUp}
        className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl md:leading-[1.15]"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
