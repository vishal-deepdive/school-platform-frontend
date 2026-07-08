import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/lib/utils";
import { useSetFlashcardProgress, ragKeys } from "@/features/rag/hooks/useRag";
import type { FlashcardDeckDetail } from "@/features/rag/types";

const SAVE_DEBOUNCE_MS = 700;

/** Flip-card review session with server-side (cross-device) mastery tracking. */
export function FlashcardReview({ deck }: { deck: FlashcardDeckDetail }) {
  const cards = deck.cards;
  const queryClient = useQueryClient();
  const { mutate: persist } = useSetFlashcardProgress();

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Mastery is seeded from the server and persisted (debounced) as it changes.
  const [mastered, setMastered] = useState<Set<string>>(
    () => new Set(deck.mastered_card_ids ?? []),
  );

  // Re-seed when switching to a different deck instance.
  useEffect(() => {
    setMastered(new Set(deck.mastered_card_ids ?? []));
    setIndex(0);
    setFlipped(false);
    setShowHint(false);
  }, [deck.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (next: Set<string>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persist(
          { id: deck.id, masteredCardIds: [...next] },
          {
            onSuccess: () =>
              queryClient.invalidateQueries({ queryKey: ragKeys.flashcards() }),
          },
        );
      }, SAVE_DEBOUNCE_MS);
    },
    [deck.id, persist, queryClient],
  );

  // Flush any pending save when the review is closed.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const update = (mutate: (s: Set<string>) => void) => {
    setMastered((prev) => {
      const next = new Set(prev);
      mutate(next);
      scheduleSave(next);
      return next;
    });
  };

  const masteredCount = mastered.size;
  const card = cards[index];

  const go = useMemo(
    () => (delta: number) => {
      setFlipped(false);
      setShowHint(false);
      setIndex((i) => (i + delta + cards.length) % cards.length);
    },
    [cards.length],
  );

  if (!card) {
    return <p className="text-sm text-muted-foreground">This deck has no cards.</p>;
  }

  const isMastered = mastered.has(card.id);

  const handleGotIt = () => {
    update((s) => s.add(card.id));
    go(1);
  };
  const handleAgain = () => {
    update((s) => s.delete(card.id));
    go(1);
  };
  const handleReset = () => update((s) => s.clear());

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Card {index + 1} of {cards.length}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            {masteredCount}/{cards.length} mastered
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${(masteredCount / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition-all duration-200 active:scale-[0.99]",
          flipped
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card hover:border-primary/30",
        )}
      >
        <Badge variant={flipped ? "primary" : "info"}>
          {flipped ? "Answer" : "Question"}
        </Badge>
        <div key={flipped ? "back" : "front"} className="animate-fade-in text-foreground">
          {flipped ? (
            <div className="text-left text-sm">
              <MarkdownRenderer content={card.back} />
            </div>
          ) : (
            <p className="text-base font-medium sm:text-lg">{card.front}</p>
          )}
        </div>
        {!flipped && (
          <span className="text-xs text-muted-foreground">Tap to reveal answer</span>
        )}
      </button>

      {/* Hint */}
      {!flipped && card.hint && (
        <div className="text-center">
          {showHint ? (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300">
              <Lightbulb className="h-4 w-4" />
              {card.hint}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Show hint
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous card">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={handleAgain}
          >
            Review again
          </Button>
          <Button
            variant={isMastered ? "secondary" : "primary"}
            size="sm"
            icon={<Check className="h-4 w-4" />}
            onClick={handleGotIt}
          >
            {isMastered ? "Mastered" : "Got it"}
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next card">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {masteredCount > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset progress
          </button>
        </div>
      )}
    </div>
  );
}
