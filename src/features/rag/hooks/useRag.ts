import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { ragApi } from "@/features/rag/api/rag";
import type { QARequest, QAResponse } from "@/features/rag/types";

export const ragKeys = {
  all: ["rag"] as const,
  metadata: () => ["rag", "metadata"] as const,
};

export function useRagMetadata() {
  return useQuery({
    queryKey: ragKeys.metadata(),
    queryFn: () => ragApi.getMetadata(),
    staleTime: 10 * 60_000,
  });
}

export function useRagQa(
  options?: UseMutationOptions<QAResponse, unknown, QARequest>,
) {
  return useMutation({
    mutationFn: (data: QARequest) => ragApi.qa(data),
    ...options,
  });
}
