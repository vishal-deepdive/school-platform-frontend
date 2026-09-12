import { describe, expect, it } from "vitest";
import type { DocumentItem } from "@/features/rag/types";
import {
  compareChapters,
  isTerminalStatus,
  resolveDocumentStatus,
} from "./documentStatus";

function doc(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    id: "d1",
    class_level: "Class 10",
    subject: "Science",
    chapter_number: "1",
    chapter_name: "Light",
    medium: "English",
    original_filename: "light.pdf",
    file_size: 1024,
    parser: "native",
    status: "pending",
    ...overrides,
  };
}

describe("resolveDocumentStatus", () => {
  it("prefers the live sample while the cached row is still in flight", () => {
    const resolved = resolveDocumentStatus(doc({ status: "processing" }), {
      document_id: "d1",
      status: "embedding",
      progress: "Embedding 40 chunks…",
    });
    expect(resolved).toMatchObject({ status: "embedding", progress: "Embedding 40 chunks…" });
  });

  it("lets the list win once it reports a terminal state", () => {
    const resolved = resolveDocumentStatus(doc({ status: "completed", total_chunks: 84 }), {
      document_id: "d1",
      status: "inserting",
    });
    expect(resolved).toEqual({ status: "completed", error: undefined, totalChunks: 84 });
  });

  it("keeps the row's error when the live sample has none", () => {
    const resolved = resolveDocumentStatus(doc({ status: "pending", error: "boom" }), {
      document_id: "d1",
      status: "failed",
    });
    expect(resolved).toMatchObject({ status: "failed", error: "boom" });
  });
});

describe("isTerminalStatus", () => {
  it("treats only completed and failed as terminal", () => {
    expect(isTerminalStatus("COMPLETED")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("embedding")).toBe(false);
    expect(isTerminalStatus(undefined)).toBe(false);
  });
});

describe("compareChapters", () => {
  it("orders chapter numbers naturally", () => {
    const sorted = [
      doc({ chapter_number: "10" }),
      doc({ chapter_number: "2" }),
      doc({ chapter_number: "10A" }),
    ].sort((a, b) => compareChapters(a, b));
    expect(sorted.map((d) => d.chapter_number)).toEqual(["2", "10", "10A"]);
  });

  it("groups by subject first when asked", () => {
    const sorted = [
      doc({ subject: "Science", chapter_number: "1" }),
      doc({ subject: "Maths", chapter_number: "3" }),
    ].sort((a, b) => compareChapters(a, b, true));
    expect(sorted.map((d) => d.subject)).toEqual(["Maths", "Science"]);
  });
});
