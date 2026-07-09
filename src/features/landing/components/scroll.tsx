import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowUp } from "lucide-react";

/* ── Parallax: translates children vertically as they cross the viewport ── */
export function Parallax({
  distance = 40,
  className,
  children,
}: {
  /** Total drift in px across the element's pass through the viewport. */
  distance?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── ParallaxAccents ──────────────────────────────────────────────────────
   Quiet registration marks in the margins of a section — a ring, a dot
   patch, and plus marks in brand blue, each drifting at its own speed as
   the section scrolls past. Ambient only: sits behind content, never
   intercepts the pointer, and holds still under reduced motion. */

function useDrift(
  progress: MotionValue<number>,
  distance: number,
  disabled: boolean,
) {
  const y = useTransform(progress, [0, 1], [distance, -distance]);
  const still = useTransform(progress, () => 0);
  return disabled ? still : y;
}

function DotPatch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={12 + col * 24}
            cy={12 + row * 24}
            r={2}
          />
        )),
      )}
    </svg>
  );
}

function PlusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    >
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export function ParallaxAccents({ flip = false }: { flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const slow = useDrift(scrollYProgress, 26, !!reduceMotion);
  const medium = useDrift(scrollYProgress, 48, !!reduceMotion);
  const fast = useDrift(scrollYProgress, 72, !!reduceMotion);

  const side = flip
    ? { ring: "left-[-90px]", dots: "right-8", plusA: "left-[12%]", plusB: "right-[18%]", orb: "left-[8%]" }
    : { ring: "right-[-90px]", dots: "left-8", plusA: "right-[12%]", plusB: "left-[18%]", orb: "right-[8%]" };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Soft brand orb, slowest layer */}
      <motion.div
        style={{ y: slow }}
        className={`absolute top-[18%] h-72 w-72 rounded-full bg-primary/[0.05] blur-3xl ${side.orb}`}
      />
      {/* Thin ring bleeding off the edge */}
      <motion.div
        style={{ y: medium }}
        className={`absolute top-[8%] h-56 w-56 rounded-full border border-primary/10 ${side.ring}`}
      />
      {/* Dot patch — the ledger's perforation */}
      <motion.div style={{ y: medium }} className={`absolute bottom-[14%] ${side.dots}`}>
        <DotPatch className="h-24 w-24 text-primary/15" />
      </motion.div>
      {/* Registration plus marks, fastest layer */}
      <motion.div style={{ y: fast }} className={`absolute top-[30%] ${side.plusA}`}>
        <PlusMark className="h-4 w-4 text-primary/25" />
      </motion.div>
      <motion.div style={{ y: fast }} className={`absolute bottom-[24%] ${side.plusB}`}>
        <PlusMark className="h-3 w-3 text-primary/20" />
      </motion.div>
    </div>
  );
}

/* ── BackToTop: appears after the hero, floats above the footer ──────────── */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 720);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/85 text-foreground/70 shadow-lg shadow-primary/5 backdrop-blur-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {/* Ring that fills with reading progress */}
          <svg
            viewBox="0 0 44 44"
            className="absolute inset-0 -rotate-90"
            aria-hidden="true"
          >
            <motion.circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-primary"
              style={{ pathLength: progress }}
            />
          </svg>
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
