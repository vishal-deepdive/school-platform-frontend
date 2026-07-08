import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, Sparkles, Trash2, Check, AlertTriangle } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { isStaff } from "@/shared/lib/permissions";
import {
  useFlashcardDecks,
  useFlashcardDeck,
  useGenerateFlashcards,
  useDeleteFlashcardDeck,
  ragKeys,
} from "@/features/rag/hooks/useRag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { FlashcardReview } from "@/features/rag/components/FlashcardReview";
import type { FlashcardDeckSummary, RagFilters } from "@/features/rag/types";

const COUNT_OPTIONS = [8, 12, 16, 20].map((n) => ({ value: String(n), label: `${n} cards` }));

export function FlashcardsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = isStaff(role);

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useFlashcardDecks();
  const { mutate: generate, isPending: isGenerating } = useGenerateFlashcards();
  const { mutate: removeDeck } = useDeleteFlashcardDeck();

  const [filters, setFilters] = useState<RagFilters>({});
  const [numCards, setNumCards] = useState(12);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: activeDeck, isLoading: loadingDeck } = useFlashcardDeck(activeId);

  const canGenerate = !!filters.class_level && !!filters.subject;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ragKeys.flashcards() });

  const handleGenerate = () => {
    generate(
      { filters, num_cards: numCards },
      {
        onSuccess: (deck) => {
          toast.success(`Created a ${deck.card_count}-card deck.`);
          refresh();
          setActiveId(deck.id);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const handleDelete = () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    removeDeck(id, {
      onSuccess: () => {
        toast.success("Deck deleted.");
        refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const decks = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <FilterBar
        title="Create a deck"
        icon={<Sparkles className="h-4 w-4" />}
        actions={
          <Button
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={!canGenerate}
            icon={<Sparkles className="h-4 w-4" />}
          >
            {isGenerating ? "Generating…" : "Generate deck"}
          </Button>
        }
      >
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-3 items-start">
            <RagFilterPanel
              filters={filters}
              onChange={setFilters}
              showTitle
              className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-start"
            />
          </div>
          <Select
            label="Cards"
            options={COUNT_OPTIONS}
            value={String(numCards)}
            onChange={(e) => setNumCards(Number(e.target.value))}
          />
        </div>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground">
            Select at least a class and subject to generate flashcards.
          </p>
        )}
      </FilterBar>

      {isLoading ? (
        <PageSkeleton showStats={false} content="card" />
      ) : decks.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="No flashcard decks yet"
          description="Generate your first deck from a chapter above — great for quick revision before a test."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                canManage={canManage}
                onOpen={() => setActiveId(deck.id)}
                onDelete={() => setConfirmId(deck.id)}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load more decks
              </Button>
            </div>
          )}
        </>
      )}

      {/* Review modal */}
      <Modal
        open={!!activeId}
        onClose={() => setActiveId(null)}
        title={activeDeck?.title ?? "Flashcards"}
        description={
          activeDeck
            ? [activeDeck.class_level, activeDeck.subject].filter(Boolean).join(" · ")
            : undefined
        }
        icon={<Layers className="h-5 w-5" />}
        size="xl"
      >
        {loadingDeck || !activeDeck ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
        ) : (
          <FlashcardReview deck={activeDeck} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Delete this deck?"
        icon={<AlertTriangle className="h-5 w-5" />}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This permanently removes the deck for everyone who can see it.
        </p>
      </Modal>
    </div>
  );
}

function DeckCard({
  deck,
  canManage,
  onOpen,
  onDelete,
}: {
  deck: FlashcardDeckSummary;
  canManage: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const masteredCount = deck.mastered_count ?? 0;
  const pct = deck.card_count ? Math.round((masteredCount / deck.card_count) * 100) : 0;

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
      {canManage && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete deck"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col gap-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <Layers className="h-5 w-5" />
        </span>
        <div>
          <p className="line-clamp-2 pr-6 font-medium text-foreground">{deck.title}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {[deck.class_level, deck.subject].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{deck.card_count} cards</span>
            {masteredCount > 0 && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-3.5 w-3.5" /> {masteredCount} mastered
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </button>
      <Badge variant="info">Revise</Badge>
    </div>
  );
}
