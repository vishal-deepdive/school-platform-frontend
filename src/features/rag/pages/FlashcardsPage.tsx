import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Layers, Plus, Sparkles, Trash2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Select } from "@/shared/components/ui/Select";
import { CardSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { getErrorMessage, isForbiddenError } from "@/shared/lib/utils";
import { ForbiddenState } from "@/shared/components/errors/ForbiddenState";
import { useAuthStore } from "@/features/auth/store/auth";
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

/** Mirrors the backend's delete_flashcard_deck authorization exactly: global
 * decks (no school_id) are admin-only; within a school, admin/principal may
 * delete any deck but a teacher may only delete one they created. */
function canDeleteDeck(
  deck: FlashcardDeckSummary,
  role: string | undefined,
  userId: string | undefined,
): boolean {
  if (!role) return false;
  if (!deck.school_id) return role === "admin";
  if (role === "admin" || role === "principal") return true;
  if (role === "teacher") return !!userId && deck.created_by === userId;
  return false;
}

export function FlashcardsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useFlashcardDecks();
  const { mutate: removeDeck, isPending: deleting } = useDeleteFlashcardDeck();

  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<FlashcardDeckSummary | null>(null);

  const { data: activeDeck, isLoading: loadingDeck } = useFlashcardDeck(activeId);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ragKeys.flashcards() });

  const handleDelete = () => {
    if (!toDelete) return;
    removeDeck(toDelete.id, {
      onSuccess: () => {
        toast.success("Deck deleted.");
        setToDelete(null);
        refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  // Ungranted teachers/students: clean access message instead of a raw error.
  if (isError && isForbiddenError(error)) {
    return (
      <ForbiddenState
        title="No access to the Study Assistant"
        description="Your account doesn't have a knowledge-base access grant yet. Ask your principal to enable Study Assistant access for you."
      />
    );
  }

  const decks = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const mastered = decks.reduce((n, d) => n + (d.mastered_count ?? 0), 0);

  const newDeckButton = (
    <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
      New deck
    </Button>
  );

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>{newDeckButton}</ModuleHeaderActions>

      {/* Non-403 failures (500/timeout): the forbidden case returned above, so a
          surviving error here is a genuine load failure. */}
      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {isLoading ? (
        <>
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        </>
      ) : decks.length === 0 ? (
        !isError && (
          <EmptyState
            icon={<Layers className="h-12 w-12" />}
            title="No flashcard decks yet"
            description="Turn any chapter into a deck of revision cards — great for a quick recap before a test."
            action={newDeckButton}
          />
        )
      ) : (
        <>
          <StatLine
            items={[
              { value: total, label: total === 1 ? "deck" : "decks" },
              {
                value: mastered,
                label: mastered === 1 ? "card mastered" : "cards mastered",
                tone: "success",
                hidden: mastered === 0,
              },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                canDelete={canDeleteDeck(deck, role, userId)}
                onOpen={() => setActiveId(deck.id)}
                onDelete={() => setToDelete(deck)}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load more decks
              </Button>
            </div>
          )}
        </>
      )}

      <CreateDeckModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(deckId) => {
          setCreateOpen(false);
          refresh();
          setActiveId(deckId);
        }}
      />

      {/* Review modal */}
      <Modal
        open={!!activeId}
        onClose={() => setActiveId(null)}
        title={activeDeck?.title ?? "Flashcards"}
        description={
          activeDeck
            ? [activeDeck.class_level, activeDeck.subject, activeDeck.medium].filter(Boolean).join(" · ")
            : undefined
        }
        icon={<Layers className="h-5 w-5" />}
        size="xl"
      >
        {loadingDeck || !activeDeck ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <FlashcardReview deck={activeDeck} />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this deck?"
        description={
          toDelete && (
            <>
              <span className="font-medium text-foreground">{toDelete.title}</span> will be removed
              for everyone who can see it, along with their progress. This can't be undone.
            </>
          )
        }
        confirmLabel="Delete deck"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function CreateDeckModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (deckId: string) => void;
}) {
  const [filters, setFilters] = useState<RagFilters>({});
  const [numCards, setNumCards] = useState(12);
  const { mutate: generate, isPending } = useGenerateFlashcards();

  const canGenerate = !!filters.class_level && !!filters.subject;

  const submit = () => {
    generate(
      { filters, num_cards: numCards },
      {
        onSuccess: (deck) => {
          toast.success(`Created a ${deck.card_count}-card deck.`);
          setFilters({});
          onCreated(deck.id);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open={open}
      // Generation takes a while; don't drop the request on a stray backdrop click.
      onClose={isPending ? () => {} : onClose}
      title="New flashcard deck"
      description="Pick a class, subject and chapter to turn into revision cards."
      icon={<Sparkles className="h-5 w-5" />}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={isPending}
            disabled={!canGenerate}
            icon={<Sparkles className="h-4 w-4" />}
          >
            {isPending ? "Generating…" : "Generate deck"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <RagFilterPanel
          filters={filters}
          onChange={setFilters}
          showTitle
          className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3"
        />
        <div className="sm:w-48">
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
      </div>
    </Modal>
  );
}

function DeckCard({
  deck,
  canDelete,
  onOpen,
  onDelete,
}: {
  deck: FlashcardDeckSummary;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const masteredCount = deck.mastered_count ?? 0;
  const pct = deck.card_count ? Math.round((masteredCount / deck.card_count) * 100) : 0;

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover">
      {canDelete && (
        <Tooltip content="Delete deck" side="left">
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${deck.title}`}
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
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
      {deck.medium && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={deck.medium === "Hindi" ? "purple" : "default"}>{deck.medium}</Badge>
        </div>
      )}
    </div>
  );
}
