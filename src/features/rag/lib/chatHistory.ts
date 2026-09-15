/**
 * Conversation context sent with a Q&A question.
 *
 * The chat UI invites follow-ups — "why?", "explain that more simply", "what
 * about the second one?" — and without the preceding turns the backend embeds
 * that literal string, so retrieval from turn two onward is effectively random.
 * `history` lets it resolve the follow-up into a standalone question first.
 */
import type { ChatMessage, ChatTurn } from "@/features/rag/types";

/**
 * Exchanges to send. Three is more than the backend currently reads (two) but
 * stays under its 8-item cap, so widening the server-side window needs no
 * frontend change.
 */
export const MAX_HISTORY_TURNS = 3;

/** Matches `ChatTurn.content`'s max_length — a long answer must not turn the
 * next question into a 422. */
export const MAX_HISTORY_CHARS = 4000;

/**
 * Build the `history` payload for *query* from the transcript so far.
 *
 * Excluded:
 * - error bubbles and empty ones — a failed answer is not a turn;
 * - the trailing re-run of the same question. "Retry" and "Explain simpler" on
 *   the latest answer both re-ask a question that is already in the transcript,
 *   and passing it as its own context would have the rewriter resolve the
 *   question against itself.
 *
 * Callers must build this BEFORE appending the new question's bubbles.
 */
export function buildChatHistory(chat: ChatMessage[], query: string): ChatTurn[] {
  let lastUserIdx = -1;
  for (let i = chat.length - 1; i >= 0; i -= 1) {
    if (chat[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  const preceding =
    lastUserIdx >= 0 && chat[lastUserIdx].content === query
      ? chat.slice(0, lastUserIdx)
      : chat;

  return preceding
    .filter((m) => !m.isError && m.content.trim())
    .slice(-MAX_HISTORY_TURNS * 2)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_CHARS) }));
}
