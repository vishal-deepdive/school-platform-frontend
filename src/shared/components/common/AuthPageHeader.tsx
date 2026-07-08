import type { ElementType, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface AuthPageHeaderProps {
  icon?: ElementType;
  title: string;
  subtitle?: ReactNode;
  className?: string;
}

/** Consistent header for auth & onboarding pages: soft icon tile + title + subtitle. */
export function AuthPageHeader({
  icon: Icon,
  title,
  subtitle,
  className,
}: AuthPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="text-balance text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
