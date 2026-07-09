import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QASource } from "@/features/rag/types";

/**
 * Bookmarked Q&A answers, persisted to localStorage so a student's saved
 * revision material survives reloads and navigation. Kept deliberately small
 * (id + text + sources) — this is a personal shortlist, not a full history.
 */
export interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  sources?: QASource[];
  /** Human-readable scope, e.g. "Class 10 · Physics · Light". */
  scope?: string;
  savedAt: number;
}

const MAX_SAVED = 100;

interface SavedAnswersState {
  items: SavedAnswer[];
  save: (item: Omit<SavedAnswer, "savedAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useSavedAnswers = create<SavedAnswersState>()(
  persist(
    (set, get) => ({
      items: [],
      save: (item) =>
        set((s) => {
          if (s.items.some((i) => i.id === item.id)) return s;
          const next = [{ ...item, savedAt: Date.now() }, ...s.items];
          return { items: next.slice(0, MAX_SAVED) };
        }),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      has: (id) => get().items.some((i) => i.id === id),
    }),
    { name: "rag-saved-answers" },
  ),
);
