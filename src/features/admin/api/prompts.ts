import { apiClient } from "@/shared/api/client";
import type {
  PromptSummary,
  PromptDetail,
  SavePromptRequest,
  SavePromptResponse,
} from "@/features/admin/types";

const PROMPTS_BASE = "/api/v1/admin/prompts";

export const promptsApi = {
  list: () =>
    apiClient.get<PromptSummary[]>(PROMPTS_BASE).then((r) => r.data),

  detail: (name: string) =>
    apiClient
      .get<PromptDetail>(`${PROMPTS_BASE}/${encodeURIComponent(name)}`)
      .then((r) => r.data),

  save: (name: string, body: SavePromptRequest) =>
    apiClient
      .put<SavePromptResponse>(`${PROMPTS_BASE}/${encodeURIComponent(name)}`, body)
      .then((r) => r.data),

  rollback: (name: string, version: number) =>
    apiClient
      .post<SavePromptResponse>(
        `${PROMPTS_BASE}/${encodeURIComponent(name)}/rollback`,
        { version },
      )
      .then((r) => r.data),
};
