import {
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { ragApi } from "@/features/rag/api/rag";
import type {
  AssignmentListResponse,
  ContentRequestStatus,
  FlashcardDeckListResponse,
} from "@/features/rag/types";

/** Page size for the paginated assignment / flashcard lists. */
const LIST_PAGE_SIZE = 24;

/** Sum of items loaded so far across infinite-query pages. */
function loadedCount(pages: { items: unknown[] }[]): number {
  return pages.reduce((n, p) => n + p.items.length, 0);
}

interface DocumentParams {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  /** Admin only: scope the listing to one school's uploads + global content. */
  school_id?: string;
}

export const ragKeys = {
  all: ["rag"] as const,
  metadata: () => ["rag", "metadata"] as const,
  classLevels: () => ["rag", "classLevels"] as const,
  documents: (params?: DocumentParams) => ["rag", "documents", params] as const,
  documentStatus: (id: string) => ["rag", "documentStatus", id] as const,
  documentChunks: (id: string) => ["rag", "documentChunks", id] as const,
  analytics: (schoolId?: string) =>
    ["rag", "analytics", schoolId ?? "platform"] as const,
  assignments: (scope: string, classLevel?: string) =>
    ["rag", "assignments", scope, classLevel ?? null] as const,
  assignment: (id: string) => ["rag", "assignment", id] as const,
  assignmentResults: (id: string) => ["rag", "assignmentResults", id] as const,
  flashcards: () => ["rag", "flashcards"] as const,
  flashcardDeck: (id: string) => ["rag", "flashcardDeck", id] as const,
  contentRequests: (status?: string) =>
    ["rag", "contentRequests", status ?? "all"] as const,
  feedback: (rating?: number) => ["rag", "feedback", rating ?? "all"] as const,
  usage: (days: number, schoolId?: string) =>
    ["rag", "usage", days, schoolId ?? "platform"] as const,
};

export function useRagMetadata() {
  return useQuery({
    queryKey: ragKeys.metadata(),
    queryFn: () => ragApi.getMetadata(),
    staleTime: 10 * 60_000,
  });
}

export function useRagClassLevels() {
  return useQuery({
    queryKey: ragKeys.classLevels(),
    queryFn: () => ragApi.getClassLevels(),
    staleTime: 30 * 60_000,
  });
}

export function useRagAnalytics(schoolId?: string) {
  return useQuery({
    queryKey: ragKeys.analytics(schoolId),
    queryFn: () => ragApi.getAnalytics(schoolId),
    staleTime: 2 * 60_000,
  });
}

export function useRagDocuments(
  params: DocumentParams,
  options?: { refetchInterval?: number | false | ((query: any) => number | false) },
) {
  return useQuery({
    queryKey: ragKeys.documents(params),
    queryFn: () => ragApi.listDocuments(params),
    ...options,
  });
}

export function useRagDocumentStatus(
  documentId: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery({
    queryKey: ragKeys.documentStatus(documentId),
    queryFn: () => ragApi.getDocumentStatus(documentId),
    ...options,
  });
}

export function useUploadRagDocument() {
  return useMutation({
    mutationFn: (data: FormData) => ragApi.uploadDocument(data),
  });
}

export function useDeleteRagDocument() {
  return useMutation({
    mutationFn: (documentId: string) => ragApi.deleteDocument(documentId),
  });
}

export function useRetryRagIngest() {
  return useMutation({
    mutationFn: (documentId: string) => ragApi.retryIngest(documentId),
  });
}

export function useDocumentChunks(documentId: string | null) {
  return useQuery({
    queryKey: ragKeys.documentChunks(documentId ?? ""),
    queryFn: () => ragApi.getDocumentChunks(documentId as string),
    enabled: !!documentId,
    staleTime: 5 * 60_000,
  });
}

export function useSubmitRagFeedback() {
  return useMutation({
    mutationFn: (data: Parameters<typeof ragApi.submitFeedback>[0]) =>
      ragApi.submitFeedback(data),
  });
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: (data: { markdown: string; title?: string }) => ragApi.downloadPdf(data),
  });
}

// ── Learning loop: practice / assignments ─────────────────────────────────────

export function useGeneratePractice() {
  return useMutation({
    mutationFn: (data: Parameters<typeof ragApi.generatePractice>[0]) =>
      ragApi.generatePractice(data),
  });
}

export function useCreateAssignment() {
  return useMutation({
    mutationFn: (data: Parameters<typeof ragApi.createAssignment>[0]) =>
      ragApi.createAssignment(data),
  });
}

export function useAssignments(
  scope: "mine" | "manage",
  opts?: { class_level?: string },
) {
  return useInfiniteQuery({
    queryKey: ragKeys.assignments(scope, opts?.class_level),
    queryFn: ({ pageParam }) =>
      ragApi.listAssignments({
        scope,
        class_level: opts?.class_level,
        limit: LIST_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last: AssignmentListResponse, all) => {
      const loaded = loadedCount(all);
      return loaded < last.total ? loaded : undefined;
    },
    staleTime: 30_000,
  });
}

export function useAssignment(id: string | null) {
  return useQuery({
    queryKey: ragKeys.assignment(id ?? ""),
    queryFn: () => ragApi.getAssignment(id as string),
    enabled: !!id,
  });
}

export function useSubmitAssignment() {
  return useMutation({
    mutationFn: (vars: {
      id: string;
      data: Parameters<typeof ragApi.submitAssignment>[1];
    }) => ragApi.submitAssignment(vars.id, vars.data),
  });
}

export function useAssignmentResults(id: string | null) {
  return useQuery({
    queryKey: ragKeys.assignmentResults(id ?? ""),
    queryFn: () => ragApi.getAssignmentResults(id as string),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useDeleteAssignment() {
  return useMutation({
    mutationFn: (id: string) => ragApi.deleteAssignment(id),
  });
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export function useGenerateFlashcards() {
  return useMutation({
    mutationFn: (data: Parameters<typeof ragApi.generateFlashcards>[0]) =>
      ragApi.generateFlashcards(data),
  });
}

export function useFlashcardDecks() {
  return useInfiniteQuery({
    queryKey: ragKeys.flashcards(),
    queryFn: ({ pageParam }) =>
      ragApi.listFlashcardDecks({ limit: LIST_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last: FlashcardDeckListResponse, all) => {
      const loaded = loadedCount(all);
      return loaded < last.total ? loaded : undefined;
    },
    staleTime: 60_000,
  });
}

export function useSetFlashcardProgress() {
  return useMutation({
    mutationFn: (vars: { id: string; masteredCardIds: string[] }) =>
      ragApi.setFlashcardProgress(vars.id, vars.masteredCardIds),
  });
}

export function useFlashcardDeck(id: string | null) {
  return useQuery({
    queryKey: ragKeys.flashcardDeck(id ?? ""),
    queryFn: () => ragApi.getFlashcardDeck(id as string),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useDeleteFlashcardDeck() {
  return useMutation({
    mutationFn: (id: string) => ragApi.deleteFlashcardDeck(id),
  });
}

// ── Content requests ──────────────────────────────────────────────────────────

export function useContentRequests(status?: ContentRequestStatus) {
  return useQuery({
    queryKey: ragKeys.contentRequests(status),
    queryFn: () => ragApi.listContentRequests({ status, limit: 100 }),
    staleTime: 30_000,
  });
}

export function useCreateContentRequest() {
  return useMutation({
    mutationFn: (data: Parameters<typeof ragApi.createContentRequest>[0]) =>
      ragApi.createContentRequest(data),
  });
}

export function useUpdateContentRequest() {
  return useMutation({
    mutationFn: (vars: { id: string; status: ContentRequestStatus }) =>
      ragApi.updateContentRequest(vars.id, vars.status),
  });
}

// ── Feedback review + adoption analytics ──────────────────────────────────────

export function useFeedbackReview(rating?: number) {
  return useQuery({
    queryKey: ragKeys.feedback(rating),
    queryFn: () => ragApi.listFeedback({ rating, limit: 50 }),
    staleTime: 30_000,
  });
}

export function useUsageAnalytics(days = 30, schoolId?: string) {
  return useQuery({
    queryKey: ragKeys.usage(days, schoolId),
    queryFn: () => ragApi.getUsageAnalytics(days, schoolId),
    staleTime: 2 * 60_000,
  });
}
