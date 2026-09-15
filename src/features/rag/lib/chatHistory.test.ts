import { describe, expect, it } from "vitest";
import { MAX_HISTORY_CHARS, MAX_HISTORY_TURNS, buildChatHistory } from "./chatHistory";
import type { ChatMessage } from "@/features/rag/types";

let seq = 0;
const user = (content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `u${seq++}`, role: "user", content, ...extra,
});
const bot = (content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `a${seq++}`, role: "assistant", content, ...extra,
});

describe("buildChatHistory", () => {
  it("is empty on the first question", () => {
    expect(buildChatHistory([], "What is molarity?")).toEqual([]);
  });

  it("sends the preceding exchange so a follow-up can be resolved", () => {
    const chat = [user("What is an equipotential surface?"), bot("A surface where...")];
    expect(buildChatHistory(chat, "why perpendicular?")).toEqual([
      { role: "user", content: "What is an equipotential surface?" },
      { role: "assistant", content: "A surface where..." },
    ]);
  });

  it("keeps oldest-first order", () => {
    const chat = [user("first"), bot("answer one"), user("second"), bot("answer two")];
    expect(buildChatHistory(chat, "third").map((t) => t.content)).toEqual([
      "first", "answer one", "second", "answer two",
    ]);
  });

  it("caps at MAX_HISTORY_TURNS exchanges, keeping the most recent", () => {
    const chat: ChatMessage[] = [];
    for (let i = 0; i < 10; i += 1) {
      chat.push(user(`q${i}`), bot(`a${i}`));
    }
    const history = buildChatHistory(chat, "next");
    expect(history).toHaveLength(MAX_HISTORY_TURNS * 2);
    expect(history[0].content).toBe("q7");
    expect(history[history.length - 1].content).toBe("a9");
  });

  it("drops error bubbles — a failed answer is not a turn", () => {
    const chat = [
      user("q1"),
      bot("The language model is temporarily unavailable.", { isError: true }),
      user("q2"),
      bot("a2"),
    ];
    expect(buildChatHistory(chat, "q3").map((t) => t.content)).toEqual(["q1", "q2", "a2"]);
  });

  it("drops empty bubbles left by a stopped stream", () => {
    const chat = [user("q1"), bot(""), user("q2"), bot("   ")];
    expect(buildChatHistory(chat, "q3").map((t) => t.content)).toEqual(["q1", "q2"]);
  });

  it("excludes the question being retried, and everything after it", () => {
    // Retry re-asks the last question; sending it as its own context would have
    // the rewriter resolve the question against itself.
    const chat = [
      user("q1"),
      bot("a1"),
      user("why is copper a conductor?"),
      bot("Something went wrong.", { isError: true }),
    ];
    expect(
      buildChatHistory(chat, "why is copper a conductor?").map((t) => t.content),
    ).toEqual(["q1", "a1"]);
  });

  it("excludes the latest question when Explain-simpler re-asks it", () => {
    const chat = [user("q1"), bot("a1"), user("what is entropy?"), bot("Entropy is...")];
    expect(buildChatHistory(chat, "what is entropy?").map((t) => t.content)).toEqual([
      "q1", "a1",
    ]);
  });

  it("keeps full history when Explain-simpler targets an OLDER question", () => {
    const chat = [user("what is entropy?"), bot("Entropy is..."), user("q2"), bot("a2")];
    expect(buildChatHistory(chat, "what is entropy?").map((t) => t.content)).toEqual([
      "what is entropy?", "Entropy is...", "q2", "a2",
    ]);
  });

  it("truncates a long answer to the backend's per-message limit", () => {
    const chat = [user("q"), bot("x".repeat(MAX_HISTORY_CHARS + 5000))];
    const history = buildChatHistory(chat, "follow up");
    expect(history[1].content).toHaveLength(MAX_HISTORY_CHARS);
  });

  it("handles a transcript with no assistant reply yet", () => {
    expect(buildChatHistory([user("q1")], "q2")).toEqual([
      { role: "user", content: "q1" },
    ]);
  });
});
