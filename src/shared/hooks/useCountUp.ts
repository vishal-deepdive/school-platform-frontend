import { useEffect, useRef, useState } from "react";

/** True when the user asked for reduced motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animates a number from 0 up to `target` once, and on each subsequent change
 * eases from the previous value to the new one. Returns the target immediately
 * (no animation) when reduced motion is requested or the value isn't finite.
 *
 * Uses an ease-out curve so the count decelerates into its final value, which
 * reads as "settling" rather than "spinning".
 */
export function useCountUp(target: number, durationMs = 450): number {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const fromRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const current = from + delta * eased;
      setValue(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = target; // land on target if interrupted
    };
  }, [target, durationMs]);

  return value;
}
