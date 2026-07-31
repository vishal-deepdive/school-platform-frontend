import type { Variants } from "framer-motion";

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export const wordReveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: EASE_OUT_EXPO },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

export const cardHover: Variants = {
  rest: { y: 0, scale: 1, boxShadow: "0px 4px 10px rgba(0,0,0,0.02)" },
  hover: { 
    y: 0, 
    scale: 1, 
    boxShadow: "0px 8px 20px rgba(0,0,0,0.08)",
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

export const shimmerLoading: Variants = {
  hidden: { backgroundPosition: "200% 0" },
  visible: { 
    backgroundPosition: "-200% 0", 
    transition: { repeat: Infinity, duration: 1.5, ease: "linear" } 
  }
};

export const accordion: Variants = {
  open: { opacity: 1, height: "auto", transition: { type: "spring", bounce: 0, duration: 0.4 } },
  collapsed: { opacity: 0, height: 0, transition: { type: "spring", bounce: 0, duration: 0.4 } }
};
