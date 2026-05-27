import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepIndex = 1 | 2 | 3 | 4 | 5

export function StepIndicator({ current, total }: { current: StepIndex; total: number }) {
  return (
    <div className="flex items-center w-full" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => {
        const step = (i + 1) as StepIndex
        const isDone   = step < current
        const isActive = step === current
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isDone   && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110',
                  !isDone && !isActive && 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
            </div>
            {i < total - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1.5 rounded-full transition-all duration-500',
                  step < current ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
