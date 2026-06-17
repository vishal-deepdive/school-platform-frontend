import { useMutation, useQuery } from "@tanstack/react-query";
import { ragApi } from "@/features/rag/api/rag";

export const ragKeys = {
  all: ["rag"] as const,
  metadata: () => ["rag", "metadata"] as const,
  classLevels: () => ["rag", "classLevels"] as const,
  documents: (params?: any) => ["rag", "documents", params] as const,
  documentStatus: (id: string) => ["rag", "documentStatus", id] as const,
};

export function useRagMetadata() {
  return useQuery({
    queryKey: ragKeys.metadata(),
    queryFn: () => ragApi.getMetadata(),
    staleTime: 10 * 60_000,
  });
}

/** Class levels the current user may select (school grades, or full list for admin). */
export function useRagClassLevels() {
  return useQuery({
    queryKey: ragKeys.classLevels(),
    queryFn: () => ragApi.getClassLevels(),
    staleTime: 30 * 60_000,
  });
}

export function useRagDocuments(
  params: { limit?: number; offset?: number; status?: string },
  options?: {
    refetchInterval?: number | false | ((query: any) => number | false);
  },
) {
  return useQuery({
    queryKey: ragKeys.documents(params),
    queryFn: () => ragApi.listDocuments(params),
    ...options,
  });
}

export function useRagDocumentStatus(documentId: string, options?: { enabled?: boolean; refetchInterval?: number }) {
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
