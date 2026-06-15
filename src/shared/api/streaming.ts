import { API_BASE_URL } from "@/shared/config/env";
import { useAuthStore } from "@/features/auth/store/auth";

/** Raised when the streaming request itself fails (non-2xx or missing body). */
export class StreamError extends Error {}

/**
 * POST `body` to `path` and yield parsed JSON objects from a
 * `text/event-stream` (SSE) response, one per `data: <json>\n\n` event.
 *
 * Uses raw `fetch` + `ReadableStream` rather than axios/EventSource: axios
 * can't stream a response body incrementally, and EventSource can't send a
 * POST body or set the `Authorization` header.
 */
export async function* streamSSE<T = unknown>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText || `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      // Response wasn't JSON — keep the status-based message.
    }
    throw new StreamError(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex = buffer.indexOf("\n\n");
    while (sepIndex !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      // Per the SSE spec an event may carry multiple `data:` lines which are
      // concatenated with newlines. Collect them all (tolerating an optional
      // space after the colon), then parse once.
      const dataPayload = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(line.startsWith("data: ") ? 6 : 5))
        .join("\n");
      if (dataPayload) {
        try {
          yield JSON.parse(dataPayload) as T;
        } catch {
          // Skip a malformed frame instead of aborting the entire stream.
        }
      }
      sepIndex = buffer.indexOf("\n\n");
    }
  }
}
