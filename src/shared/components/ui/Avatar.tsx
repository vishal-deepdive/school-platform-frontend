import { cn } from "@/shared/lib/utils";

// Deterministic, theme-aware tint per person so the same student always reads
// with the same colour across roll-call, roster and record views. Kept soft
// (/15 fills) so a wall of avatars never overwhelms the surrounding UI.
const PALETTE = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  "bg-teal-500/15 text-teal-600 dark:text-teal-300",
];

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface AvatarProps {
  name: string;
  /** Extra seed (e.g. roll number) so same-named students still differ. */
  seed?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Avatar({ name, seed, size = "md", className }: AvatarProps) {
  const tint = PALETTE[hashString((name || "") + (seed ?? "")) % PALETTE.length];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        sizeClasses[size],
        tint,
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name || seed || "?")}
    </span>
  );
}
