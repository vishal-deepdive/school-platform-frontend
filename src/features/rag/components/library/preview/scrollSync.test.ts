import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewScrollSync } from "./scrollSync";

/**
 * The controller only touches a handful of DOM APIs (scroll offsets, element
 * rects, listeners, rAF), so it is exercised here against a tiny fake layout
 * engine. That keeps the coupling maths — which pane leads, where the follower
 * lands, when geometry is re-measured — under a deterministic test instead of a
 * hand-driven browser check.
 */

interface PageSpec {
  page: number;
  height: number;
}

class FakePane {
  scrollTop = 0;
  readonly clientHeight: number;
  private readonly listeners = new Map<string, Set<(e: unknown) => void>>();
  private tops: number[] = [];

  constructor(
    private pages: PageSpec[],
    clientHeight = 300,
  ) {
    this.clientHeight = clientHeight;
    this.layout();
  }

  layout() {
    let top = 0;
    this.tops = this.pages.map((p) => {
      const at = top;
      top += p.height;
      return at;
    });
  }

  setHeight(page: number, height: number) {
    const entry = this.pages.find((p) => p.page === page);
    if (entry) entry.height = height;
    this.layout();
  }

  topOf(page: number) {
    return this.tops[this.pages.findIndex((p) => p.page === page)];
  }

  heightOf(page: number) {
    return this.pages.find((p) => p.page === page)!.height;
  }

  get scrollHeight() {
    return this.pages.reduce((sum, p) => sum + p.height, 0);
  }

  get firstElementChild() {
    return null;
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 400, height: this.clientHeight };
  }

  querySelectorAll() {
    return this.pages.map((p, i) => ({
      dataset: { page: String(p.page) },
      getBoundingClientRect: () => ({
        // Rects are viewport-relative, so they move with the scroll position —
        // exactly what the controller compensates for.
        top: this.tops[i] - this.scrollTop,
        left: 0,
        width: 400,
        height: p.height,
      }),
    }));
  }

  addEventListener(type: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }

  removeEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners.get(type)?.delete(fn);
  }

  scrollTo(opts: { top: number }) {
    // Smooth behaviour is frame-driven in a real browser; land immediately.
    this.scrollTo_(opts.top);
  }

  /** Scroll the way a user would, then let the controller react. */
  userScrollTo(top: number) {
    this.fire("wheel");
    this.scrollTo_(top);
  }

  scrollTo_(top: number) {
    this.scrollTop = Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight));
    this.fire("scroll");
  }

  fire(type: string) {
    this.listeners.get(type)?.forEach((fn) => fn({}));
  }
}

let frames: (() => void)[] = [];

function flush(times = 3) {
  for (let i = 0; i < times; i++) {
    const queued = frames;
    frames = [];
    queued.forEach((fn) => fn());
  }
}

const asEl = (pane: FakePane) => pane as unknown as HTMLElement;

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

/** Two panes whose pages deliberately differ in height. */
function setup() {
  const text = new FakePane([
    { page: 1, height: 400 },
    { page: 2, height: 900 },
    { page: 3, height: 300 },
    { page: 4, height: 700 },
    { page: 5, height: 500 },
    { page: 6, height: 650 },
  ]);
  const pdf = new FakePane([
    { page: 1, height: 800 },
    { page: 2, height: 500 },
    { page: 3, height: 900 },
    { page: 4, height: 400 },
    { page: 5, height: 850 },
    { page: 6, height: 300 },
  ]);
  const sync = new PreviewScrollSync();
  sync.attach("text", asEl(text));
  sync.attach("pdf", asEl(pdf));
  sync.setEnabled(true);
  flush();
  return { text, pdf, sync };
}

describe("PreviewScrollSync", () => {
  it("follows the leader by page and sub-page progress, not by pixels", () => {
    const { text, pdf, sync } = setup();

    for (const [page, progress] of [
      [2, 0.5],
      [4, 0.25],
      [3, 0.8],
    ] as const) {
      text.userScrollTo(text.topOf(page) + progress * text.heightOf(page));
      flush();
      const expected = Math.min(
        pdf.topOf(page) + progress * pdf.heightOf(page),
        pdf.scrollHeight - pdf.clientHeight,
      );
      expect(pdf.scrollTop).toBeCloseTo(expected, 0);
    }
    expect(sync.getView("text").page).toBe(3);
  });

  it("couples in both directions", () => {
    const { text, pdf } = setup();
    pdf.userScrollTo(pdf.topOf(3) + 0.4 * pdf.heightOf(3));
    flush();
    expect(text.scrollTop).toBeCloseTo(text.topOf(3) + 0.4 * text.heightOf(3), 0);
  });

  it("does not echo the follower's scroll back at the leader", () => {
    const { pdf } = setup();
    pdf.userScrollTo(pdf.topOf(4));
    flush();
    const leaderAt = pdf.scrollTop;
    // Extra frames: a naive implementation ping-pongs here.
    flush(8);
    expect(pdf.scrollTop).toBe(leaderAt);
  });

  it("leaves the panes independent while sync is off", () => {
    const { text, pdf, sync } = setup();
    text.userScrollTo(text.topOf(3));
    flush();
    const frozen = pdf.scrollTop;

    sync.setEnabled(false);
    text.userScrollTo(text.topOf(5));
    flush();
    expect(pdf.scrollTop).toBe(frozen);

    sync.setEnabled(true);
    text.userScrollTo(text.topOf(5) + 10);
    flush();
    expect(pdf.scrollTop).toBeCloseTo(pdf.topOf(5) + 10 * (pdf.heightOf(5) / text.heightOf(5)), -1);
  });

  it("re-measures after the content changes height", () => {
    const { text, pdf, sync } = setup();
    // A virtualized markdown page rendering pushes everything below it down.
    text.setHeight(1, 1200);
    sync.invalidate("text");
    flush();

    text.userScrollTo(text.topOf(3) + 0.5 * text.heightOf(3));
    flush();
    expect(pdf.scrollTop).toBeCloseTo(pdf.topOf(3) + 0.5 * pdf.heightOf(3), 0);
  });

  it("publishes the page and visible range, but not every sub-page pixel", () => {
    const { text, sync } = setup();
    const onChange = vi.fn();
    sync.subscribeView("text", onChange);

    text.userScrollTo(text.topOf(2));
    flush();
    expect(sync.getView("text").page).toBe(2);
    const afterPageChange = onChange.mock.calls.length;
    expect(afterPageChange).toBeGreaterThan(0);

    // Creeping through the middle of the same page changes progress only.
    text.userScrollTo(text.topOf(2) + 200);
    flush();
    text.userScrollTo(text.topOf(2) + 260);
    flush();
    expect(sync.getView("text").progress).toBeGreaterThan(0.2);
    expect(onChange.mock.calls.length).toBe(afterPageChange);
  });

  it("reports the visible range for virtualization", () => {
    const { text, sync } = setup();
    // Page 3 is 300px tall in a 300px viewport, so pages 3 and 4 are both on
    // screen once the viewport straddles the boundary.
    text.userScrollTo(text.topOf(3) + 150);
    flush();
    const view = sync.getView("text");
    expect(view.first).toBe(3);
    expect(view.last).toBe(4);
  });

  it("falls back to proportional travel when the panes do not share a page", () => {
    const text = new FakePane([
      { page: 1, height: 500 },
      { page: 2, height: 500 },
      { page: 3, height: 500 },
    ]);
    const pdf = new FakePane([
      { page: 1, height: 800 },
      { page: 2, height: 800 },
    ]);
    const sync = new PreviewScrollSync();
    sync.attach("text", asEl(text));
    sync.attach("pdf", asEl(pdf));
    sync.setEnabled(true);
    flush();

    text.userScrollTo(text.topOf(3));
    flush();
    const ratio = text.scrollTop / (text.scrollHeight - text.clientHeight);
    expect(pdf.scrollTop).toBeCloseTo(ratio * (pdf.scrollHeight - pdf.clientHeight), 0);
  });

  it("steers both panes to a page", () => {
    const { text, pdf, sync } = setup();
    sync.scrollToPage(5);
    expect(text.scrollTop).toBeCloseTo(text.topOf(5) - 10, 0);
    expect(pdf.scrollTop).toBeCloseTo(
      Math.min(pdf.topOf(5) - 10, pdf.scrollHeight - pdf.clientHeight),
      0,
    );
  });

  it("reveals a band only when it is not comfortably on screen", () => {
    const { pdf, sync } = setup();
    pdf.scrollTo_(1000);
    const at = pdf.scrollTop;

    sync.reveal("pdf", at + 120, 20);
    expect(pdf.scrollTop).toBe(at);

    sync.reveal("pdf", at + 2000, 20);
    expect(pdf.scrollTop).toBeGreaterThan(at);
  });

  it("stops touching the panes once destroyed", () => {
    const { text, pdf, sync } = setup();
    text.userScrollTo(text.topOf(2));
    flush();
    const at = pdf.scrollTop;

    sync.destroy();
    text.userScrollTo(text.topOf(5));
    flush();
    expect(pdf.scrollTop).toBe(at);
  });
});
