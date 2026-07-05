import { useEffect, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

interface SpotlightGridProps {
  /** Radius of the cursor spotlight, in px. */
  radius?: number;
}

// A soft, trailing follow — not a rigid 1:1 lock to the pointer.
const FOLLOW_SPRING = { stiffness: 170, damping: 28, mass: 0.55 };
const FADE_SPRING = { stiffness: 120, damping: 22 };

/**
 * The hero's register grid, lit by the cursor. A quiet base grid stays present
 * everywhere; where the pointer moves, the timetable lines light up in brand
 * blue and a soft color wash trails behind. Purely ambient — sits behind the
 * content and never intercepts pointer events.
 *
 * The pointer listeners are attached to the parent section so movement over the
 * headline and buttons still drives the glow. Disabled for reduced-motion and
 * coarse (touch) pointers, where the static base grid is shown alone.
 */
export function SpotlightGrid({ radius = 260 }: SpotlightGridProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Parked far off-canvas until the pointer first enters.
  const mouseX = useMotionValue(-radius * 4);
  const mouseY = useMotionValue(-radius * 4);
  const x = useSpring(mouseX, FOLLOW_SPRING);
  const y = useSpring(mouseY, FOLLOW_SPRING);
  const opacity = useSpring(0, FADE_SPRING);

  const spotlightMask = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, #000 0%, transparent 78%)`;
  const colorGlow = useMotionTemplate`radial-gradient(${
    radius * 1.5
  }px circle at ${x}px ${y}px, hsl(var(--primary) / 0.18), transparent 72%)`;

  useEffect(() => {
    const section = ref.current?.parentElement;
    if (!section || reduceMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let entered = false;
    const localPoint = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top] as const;
    };

    const onEnter = (e: PointerEvent) => {
      const [px, py] = localPoint(e);
      // Jump (no spring) so the glow appears where the cursor is instead of
      // streaking in from its parked position.
      mouseX.jump(px);
      mouseY.jump(py);
      x.jump(px);
      y.jump(py);
      entered = true;
      opacity.set(1);
    };
    const onMove = (e: PointerEvent) => {
      if (!entered) {
        onEnter(e);
        return;
      }
      const [px, py] = localPoint(e);
      mouseX.set(px);
      mouseY.set(py);
    };
    const onLeave = () => {
      entered = false;
      opacity.set(0);
    };

    section.addEventListener("pointerenter", onEnter);
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, [reduceMotion, mouseX, mouseY, x, y, opacity]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Base register grid — quiet, always present, fading in from the top. */}
      <div className="mask-radial-fade absolute inset-0 bg-grid-slate dark:bg-grid-white" />

      {/* Establishing brand light anchored to the top (static, unchanged). */}
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_-5%,hsl(var(--primary)/0.13),transparent_72%)]" />

      {/* Ambient color wash trailing the cursor. */}
      <motion.div
        className="absolute inset-0"
        style={{ opacity, background: colorGlow }}
      />

      {/* Register lines lit in brand blue, revealed only around the cursor. */}
      <motion.div
        className="bg-grid-primary absolute inset-0"
        style={{
          opacity,
          WebkitMaskImage: spotlightMask,
          maskImage: spotlightMask,
        }}
      />
    </div>
  );
}
