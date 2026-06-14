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

      const dataLine = rawEvent
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (dataLine) {
        yield JSON.parse(dataLine.slice("data: ".length)) as T;
      }
      sepIndex = buffer.indexOf("\n\n");
    }
  }
}
