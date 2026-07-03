import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type StepIndex = 1 | 2 | 3 | 4 | 5;

interface StepIndicatorProps {
  current: StepIndex;
  total: number;
  /** Optional labels used for accessible names ("Step 2: Contact & Address"). */
  labels?: string[];
  /** When provided, completed steps become clickable to jump back. */
  onStepClick?: (step: StepIndex) => void;
}

export function StepIndicator({
  current,
  total,
  labels,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <ol
      className="flex items-center w-full list-none"
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const step = (i + 1) as StepIndex;
        const isDone = step < current;
        const isActive = step === current;
        const name = labels?.[i] ? `Step ${step}: ${labels[i]}` : `Step ${step}`;
        // Only completed steps are navigable (can't skip ahead past validation).
        const clickable = isDone && !!onStepClick;

        const circle = (
          <span
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
              isDone && "bg-primary text-primary-foreground",
              isActive &&
                "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110",
              !isDone && !isActive && "bg-muted text-muted-foreground",
            )}
          >
            {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : step}
          </span>
        );

        return (
          <React.Fragment key={step}>
            <li
              className="flex flex-col items-center"
              aria-current={isActive ? "step" : undefined}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick!(step)}
                  aria-label={`Go back to ${name}`}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {circle}
                </button>
              ) : (
                <span aria-label={name} title={name}>
                  {circle}
                </span>
              )}
            </li>
            {i < total - 1 && (
              <div
                aria-hidden
                className={cn(
                  "flex-1 h-0.5 mx-1.5 rounded-full transition-all duration-500",
                  step < current ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
