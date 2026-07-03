import { API_BASE_URL } from "@/shared/config/env";
import { decodeJwt } from "@/shared/lib/jwt";
import {
  getAccessToken,
  hasActiveSession,
  refreshAccessToken,
  isDefinitiveAuthFailure,
  forceLogout,
} from "@/shared/api/client";

/** Raised when the streaming request itself fails (non-2xx or missing body). */
export class StreamError extends Error {}

// Renew a little before expiry so a long stream isn't opened with a token that
// dies mid-handshake. Mirrors the axios client's proactive skew.
const TOKEN_SKEW_MS = 60_000;

/** True if the token is missing or within the skew window of expiring. */
function tokenNeedsRefresh(token: string | null): boolean {
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false; // opaque/undecodable — let the server judge it
  return decoded.exp * 1_000 - TOKEN_SKEW_MS <= Date.now();
}

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
async function openStream(
  path: string,
  body: unknown,
  token: string | null,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
}

export async function* streamSSE<T = unknown>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  let token = getAccessToken();

  // Proactively refresh a missing/near-expired token before opening the stream,
  // so we don't fail the handshake on a token that's about to die. Transient
  // refresh failures fall through — the server still gets a shot with whatever
  // token we have and the 401-retry below is the backstop.
  if (hasActiveSession() && tokenNeedsRefresh(token)) {
    try {
      token = await refreshAccessToken();
    } catch (err) {
      if (isDefinitiveAuthFailure(err)) {
        forceLogout();
        throw new StreamError("Session expired. Please log in again.");
      }
    }
  }

  let res = await openStream(path, body, token, signal);

  // Connect-time 401: the access token was rejected. Refresh once (single-flight,
  // shared with the axios client) and retry — mirrors the axios interceptor so
  // streaming endpoints heal the same way. Never retry an aborted request.
  if (res.status === 401 && hasActiveSession() && !signal?.aborted) {
    try {
      token = await refreshAccessToken();
      res = await openStream(path, body, token, signal);
    } catch (err) {
      if (isDefinitiveAuthFailure(err)) {
        forceLogout();
        throw new StreamError("Session expired. Please log in again.");
      }
      // Transient refresh failure — fall through and surface the original 401.
    }
  }

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

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      // Decode only the new chunk and normalise CRLF within it.
      // If a "\r\n" straddles a chunk boundary (the "\r" was the last byte of
      // the previous chunk and "\n" is the first byte here), remove the
      // dangling "\r" that was already appended to the buffer.
      let chunk = decoder.decode(value, { stream: true });
      if (buffer.endsWith("\r") && chunk.startsWith("\n")) {
        buffer = buffer.slice(0, -1);
      }
      buffer += chunk.replace(/\r\n/g, "\n");

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
  } finally {
    // Release the reader lock on every exit path: normal completion, thrown
    // error, AbortSignal, or the consumer abandoning the generator early.
    reader.cancel().catch(() => {});
  }
}
