import { API_BASE_URL } from "@/shared/config/env";
import { useAuthStore } from "@/features/auth/store/auth";

/** Raised when the streaming request itself fails (non-2xx or missing body). */
export class StreamError extends Error {}

/**
 * Parse one raw SSE event block into its JSON payload, or `undefined` if the
 * block carries no usable `data:` payload (e.g. a comment/keep-alive line).
 *
 * Per the SSE spec an event may carry multiple `data:` lines which are
 * concatenated with newlines. We collect them all (tolerating an optional space
 * after the colon), then parse once. A malformed frame yields `undefined`
 * rather than throwing so a single bad event can't abort the whole stream.
 */
function parseEvent<T>(rawEvent: string): T | undefined {
  const dataPayload = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(line.startsWith("data: ") ? 6 : 5))
    .join("\n");
  if (!dataPayload || dataPayload === "[DONE]") return undefined;
  try {
    return JSON.parse(dataPayload) as T;
  } catch {
    return undefined;
  }
}

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
    // Normalise CRLF on the whole buffer (not just this chunk) so events split
    // reliably on a blank line even when a "\r\n" lands across a chunk boundary.
    buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n");

    let sepIndex = buffer.indexOf("\n\n");
    while (sepIndex !== -1) {
      const event = parseEvent<T>(buffer.slice(0, sepIndex));
      buffer = buffer.slice(sepIndex + 2);
      if (event !== undefined) yield event;
      sepIndex = buffer.indexOf("\n\n");
    }
  }

  // The server may close the stream right after the final event without a
  // trailing blank line — flush any complete event still sitting in the buffer.
  buffer += decoder.decode().replace(/\r\n/g, "\n");
  const tail = parseEvent<T>(buffer);
  if (tail !== undefined) yield tail;
}
