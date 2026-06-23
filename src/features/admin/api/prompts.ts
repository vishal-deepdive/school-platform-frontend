import { apiClient } from "@/shared/api/client";
import type {
  PromptSummary,
  PromptDetail,
  SavePromptRequest,
  SavePromptResponse,
  PromptRefreshResponse,
} from "@/features/admin/types";

const BASE = "/api/v1/admin/prompts";
const enc = (name: string) => encodeURIComponent(name);

export const promptsApi = {
  list: () =>
    apiClient.get<PromptSummary[]>(BASE).then((r) => r.data),

  getDetail: (name: string) =>
    apiClient.get<PromptDetail>(`${BASE}/${enc(name)}`).then((r) => r.data),

  save: (name: string, data: SavePromptRequest) =>
    apiClient.put<SavePromptResponse>(`${BASE}/${enc(name)}`, data).then((r) => r.data),

  rollback: (name: string, version: number) =>
    apiClient
      .post<SavePromptResponse>(`${BASE}/${enc(name)}/rollback`, { version })
      .then((r) => r.data),

  /** Force-bypass the 60s in-process cache and return the version the backend
   *  is NOW serving. Also propagates any Langfuse-UI-side change immediately. */
  refresh: (name: string) =>
    apiClient
      .post<PromptRefreshResponse>(`${BASE}/${enc(name)}/refresh`)
      .then((r) => r.data),
};
