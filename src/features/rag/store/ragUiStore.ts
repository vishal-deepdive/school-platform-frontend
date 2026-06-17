import { create } from "zustand";
import type {
  ChatMessage,
  Difficulty,
  QASource,
  QuestionType,
  RagFilters,
} from "@/features/rag/types";

/**
 * In-memory UI state for the RAG pages (Q&A, Notes, Questions).
 *
 * Kept outside React component state so chat history / generated content /
 * filters survive client-side navigation between tabs — React Router
 * unmounts each page on route change, but this module-level store does not.
 */

interface QAState {
  chat: ChatMessage[];
  filters: RagFilters;
  isStreaming: boolean;
}

interface NotesState {
  filters: RagFilters;
  result: string | null;
  isPending: boolean;
}

interface QuestionsState {
  filters: RagFilters;
  qType: QuestionType;
  difficulty: Difficulty;
  numQuestions: number;
  marks?: number;
  result: string | null;
  isPending: boolean;
}

interface RagUiState {
  qa: QAState;
  notes: NotesState;
  questions: QuestionsState;

  setQaFilters: (filters: RagFilters) => void;
  setQaStreaming: (isStreaming: boolean) => void;
  appendChatMessages: (messages: ChatMessage[]) => void;
  appendToMessage: (id: string, token: string) => void;
  setMessageSources: (id: string, sources: QASource[]) => void;
  setMessageError: (id: string, message: string) => void;
  clearQaChat: () => void;

  setNotesFilters: (filters: RagFilters) => void;
  setNotesPending: (isPending: boolean) => void;
  setNotesResult: (result: string | null) => void;
  appendNotesResult: (token: string) => void;

  setQuestionsFilters: (filters: RagFilters) => void;
  setQuestionsConfig: (
    partial: Partial<
      Pick<QuestionsState, "qType" | "difficulty" | "numQuestions" | "marks">
    >,
  ) => void;
  setQuestionsPending: (isPending: boolean) => void;
  setQuestionsResult: (result: string | null) => void;
  appendQuestionsResult: (token: string) => void;
}

export const useRagUiStore = create<RagUiState>((set) => ({
  qa: { chat: [], filters: {}, isStreaming: false },
  notes: { filters: {}, result: null, isPending: false },
  questions: {
    filters: {},
    qType: "MCQ",
    difficulty: "Medium",
    numQuestions: 10,
    marks: undefined,
    result: null,
    isPending: false,
  },

  setQaFilters: (filters) =>
    set((s) => ({ qa: { ...s.qa, filters } })),
  setQaStreaming: (isStreaming) =>
    set((s) => ({ qa: { ...s.qa, isStreaming } })),
  appendChatMessages: (messages) =>
    set((s) => ({ qa: { ...s.qa, chat: [...s.qa.chat, ...messages] } })),
  appendToMessage: (id, token) =>
    set((s) => ({
      qa: {
        ...s.qa,
        chat: s.qa.chat.map((m) =>
          m.id === id ? { ...m, content: m.content + token } : m,
        ),
      },
    })),
  setMessageSources: (id, sources) =>
    set((s) => ({
      qa: {
        ...s.qa,
        chat: s.qa.chat.map((m) => (m.id === id ? { ...m, sources } : m)),
      },
    })),
  setMessageError: (id, message) =>
    set((s) => ({
      qa: {
        ...s.qa,
        chat: s.qa.chat.map((m) =>
          m.id === id ? { ...m, content: message, isError: true, sources: [] } : m,
        ),
      },
    })),
  clearQaChat: () => set((s) => ({ qa: { ...s.qa, chat: [] } })),

  setNotesFilters: (filters) =>
    set((s) => ({ notes: { ...s.notes, filters } })),
  setNotesPending: (isPending) =>
    set((s) => ({ notes: { ...s.notes, isPending } })),
  setNotesResult: (result) =>
    set((s) => ({ notes: { ...s.notes, result } })),
  appendNotesResult: (token) =>
    set((s) => ({
      notes: { ...s.notes, result: (s.notes.result ?? "") + token },
    })),

  setQuestionsFilters: (filters) =>
    set((s) => ({ questions: { ...s.questions, filters } })),
  setQuestionsConfig: (partial) =>
    set((s) => ({ questions: { ...s.questions, ...partial } })),
  setQuestionsPending: (isPending) =>
    set((s) => ({ questions: { ...s.questions, isPending } })),
  setQuestionsResult: (result) =>
    set((s) => ({ questions: { ...s.questions, result } })),
  appendQuestionsResult: (token) =>
    set((s) => ({
      questions: { ...s.questions, result: (s.questions.result ?? "") + token },
    })),
}));
