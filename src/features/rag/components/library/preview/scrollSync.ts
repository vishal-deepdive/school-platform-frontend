import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

/**
 * Scroll coupling for the side-by-side chapter preview.
 *
 * The previous implementation pushed a React state update per scroll event,
 * which re-rendered the whole preview tree dozens of times a second and made
 * the modal feel stuck to the mouse wheel. This controller lives entirely
 * outside React: scroll events are passive, coalesced into one
 * `requestAnimationFrame` per frame, and applied by writing `scrollTop`
 * directly on the follower. React only hears about a pane when its *integer*
 * page or visible range changes — a few times per chapter, not per frame.
 *
 * Page geometry is measured once per layout change (ResizeObserver, plus an
 * explicit `invalidate` when a pane swaps content) and cached, so a scroll
 * frame costs one binary search rather than a DOM query.
 */

export type PaneId = "text" | "pdf";

export interface PageBox {
  page: number;
  /** Scroll offset of the page's top edge inside its scroller. */
  top: number;
  height: number;
}

export interface PaneView {
  /** Page under the reading anchor near the top of the viewport. */
  page: number;
  /** How far into that page the viewport sits, 0–1. */
  progress: number;
  /** Inclusive range of pages with any pixel on screen. */
  first: number;
  last: number;
}

const EMPTY_VIEW: PaneView = { page: 1, progress: 0, first: 1, last: 1 };

/** A smooth programmatic scroll owns its pane for this long. */
const SMOOTH_MS = 420;
/** Hover work pauses for this long after the last scroll tick. */
const SCROLL_QUIET_MS = 90;

interface Pane {
  el: HTMLElement;
  boxes: PageBox[] | null;
  ro: ResizeObserver;
  dispose: () => void;
  smoothUntil: number;
}

function other(id: PaneId): PaneId {
  return id === "text" ? "pdf" : "text";
}

export class PreviewScrollSync {
  private panes = new Map<PaneId, Pane>();
  private views = new Map<PaneId, PaneView>();
  private listeners = new Map<PaneId, Set<() => void>>();
  private leader: PaneId = "text";
  private enabled = true;
  private frame = 0;
  private queued = new Set<PaneId>();
  private quietUntil = 0;

  // ── Pane lifecycle ────────────────────────────────────────────────────────

  /** Attach a scroller. Returns the detach function for the effect cleanup. */
  attach(id: PaneId, el: HTMLElement): () => void {
    this.detach(id);

    const onScroll = () => {
      this.quietUntil = performance.now() + SCROLL_QUIET_MS;
      this.schedule(id);
    };
    // Wheel / touch / keys are unambiguous intent, so they take the lead even
    // mid-animation; merely moving the pointer across a pane does not.
    const claimHard = () => this.claim(id, true);
    const claimSoft = () => this.claim(id, false);

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", claimHard, { passive: true });
    el.addEventListener("touchstart", claimHard, { passive: true });
    el.addEventListener("keydown", claimHard);
    el.addEventListener("pointerenter", claimSoft);

    const ro = new ResizeObserver(() => this.invalidate(id));
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    const pane: Pane = {
      el,
      boxes: null,
      ro,
      smoothUntil: 0,
      dispose: () => {
        el.removeEventListener("scroll", onScroll);
        el.removeEventListener("wheel", claimHard);
        el.removeEventListener("touchstart", claimHard);
        el.removeEventListener("keydown", claimHard);
        el.removeEventListener("pointerenter", claimSoft);
        ro.disconnect();
      },
    };
    this.panes.set(id, pane);
    this.schedule(id);
    return () => this.detach(id);
  }

  detach(id: PaneId) {
    const pane = this.panes.get(id);
    if (!pane) return;
    pane.dispose();
    this.panes.delete(id);
  }

  destroy() {
    for (const id of [...this.panes.keys()]) this.detach(id);
    this.listeners.clear();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Page geometry changed (content rendered, zoom, virtualization window). */
  invalidate(id?: PaneId) {
    for (const [key, pane] of this.panes) {
      if (id && key !== id) continue;
      pane.boxes = null;
      this.schedule(key);
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  /** True while the reader is actively scrolling — hover work stands down. */
  isScrolling() {
    return performance.now() < this.quietUntil;
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  getView(id: PaneId): PaneView {
    return this.views.get(id) ?? EMPTY_VIEW;
  }

  subscribeView(id: PaneId, cb: () => void): () => void {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }

  // ── Steering ──────────────────────────────────────────────────────────────

  /** Put both panes at the top of `page`. */
  scrollToPage(page: number) {
    for (const [id, pane] of this.panes) {
      const box = this.boxFor(id, page);
      if (!box) continue;
      pane.smoothUntil = performance.now() + SMOOTH_MS;
      pane.el.scrollTo({ top: Math.max(0, box.top - 10), behavior: "smooth" });
    }
  }

  /**
   * Bring a band of one pane into a comfortable reading position — used by the
   * hover reflection to follow the highlight without yanking the page when the
   * match is already on screen.
   */
  reveal(id: PaneId, top: number, height: number) {
    const pane = this.panes.get(id);
    if (!pane) return;
    const { el } = pane;
    const view = el.scrollTop;
    const bottom = view + el.clientHeight;
    if (top >= view + 48 && top + height <= bottom - 48) return;

    pane.smoothUntil = performance.now() + SMOOTH_MS;
    el.scrollTo({
      top: Math.max(0, top - el.clientHeight * 0.32),
      behavior: "smooth",
    });
  }

  /** Absolute scroll offset of a page inside a pane, or null when unknown. */
  pageTop(id: PaneId, page: number): number | null {
    return this.boxFor(id, page)?.top ?? null;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private claim(id: PaneId, hard: boolean) {
    const pane = this.panes.get(id);
    if (!pane) return;
    if (!hard && performance.now() < pane.smoothUntil) return;
    if (hard) pane.smoothUntil = 0;
    this.leader = id;
  }

  private schedule(id: PaneId) {
    this.queued.add(id);
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const ids = [...this.queued];
      this.queued.clear();
      for (const paneId of ids) this.tick(paneId);
    });
  }

  private tick(id: PaneId) {
    const pane = this.panes.get(id);
    if (!pane) return;

    this.publish(id);
    if (!this.enabled || this.leader !== id) return;

    const followerId = other(id);
    const follower = this.panes.get(followerId);
    if (!follower) return;
    // Do not fight an animation the follower is already running.
    if (performance.now() < follower.smoothUntil) return;

    const view = this.views.get(id) ?? EMPTY_VIEW;
    const box = this.boxFor(followerId, view.page);
    let top: number;
    if (box) {
      top = box.top + view.progress * box.height;
    } else {
      // Page numbering the two panes do not share (unplaced markdown sections,
      // a PDF with a different page count) — fall back to proportional travel.
      const lead = pane.el;
      const ratio = lead.scrollTop / Math.max(1, lead.scrollHeight - lead.clientHeight);
      top = ratio * Math.max(0, follower.el.scrollHeight - follower.el.clientHeight);
    }

    const target = Math.max(0, Math.round(top));
    if (Math.abs(follower.el.scrollTop - target) > 0.5) {
      follower.el.scrollTop = target;
      this.publish(followerId);
    }
  }

  /** Recompute a pane's view and notify React only when something visible moved. */
  private publish(id: PaneId) {
    const next = this.computeView(id);
    if (!next) return;
    const prev = this.views.get(id);
    this.views.set(id, next);
    if (prev && prev.page === next.page && prev.first === next.first && prev.last === next.last) {
      // Sub-page progress moved; nobody rendering needs to know.
      return;
    }
    this.listeners.get(id)?.forEach((cb) => cb());
  }

  private computeView(id: PaneId): PaneView | null {
    const pane = this.panes.get(id);
    if (!pane) return null;
    const boxes = this.boxes(id);
    if (!boxes || boxes.length === 0) return null;

    const { el } = pane;
    const scrollTop = el.scrollTop;
    const viewportBottom = scrollTop + el.clientHeight;
    // Read the page the eye is on, not the sliver clipped at the very top.
    const anchor = scrollTop + Math.min(80, el.clientHeight * 0.15);

    let i = lastIndexAtOrBefore(boxes, anchor);
    if (i < 0) i = 0;
    const box = boxes[i];

    let first = boxes.length - 1;
    let last = 0;
    for (let k = 0; k < boxes.length; k++) {
      const b = boxes[k];
      if (b.top + b.height <= scrollTop || b.top >= viewportBottom) continue;
      if (k < first) first = k;
      if (k > last) last = k;
    }
    if (first > last) {
      first = i;
      last = i;
    }

    return {
      page: box.page,
      progress: clamp01((scrollTop - box.top) / Math.max(1, box.height)),
      first: boxes[first].page,
      last: boxes[last].page,
    };
  }

  private boxes(id: PaneId): PageBox[] | null {
    const pane = this.panes.get(id);
    if (!pane) return null;
    if (pane.boxes) return pane.boxes;

    const { el } = pane;
    const origin = el.getBoundingClientRect();
    const scrollTop = el.scrollTop;
    const boxes: PageBox[] = [];
    el.querySelectorAll<HTMLElement>("[data-page]").forEach((node) => {
      const page = Number(node.dataset.page);
      if (!Number.isFinite(page) || page < 1) return;
      const rect = node.getBoundingClientRect();
      // Rect maths rather than offsetTop: correct whoever the offsetParent is.
      boxes.push({
        page,
        top: rect.top - origin.top + scrollTop,
        height: rect.height,
      });
    });
    boxes.sort((a, b) => a.top - b.top);
    pane.boxes = boxes;
    return boxes;
  }

  private boxFor(id: PaneId, page: number): PageBox | null {
    const boxes = this.boxes(id);
    if (!boxes) return null;
    for (const box of boxes) if (box.page === page) return box;
    return null;
  }
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Index of the last box starting at or before `offset`. */
function lastIndexAtOrBefore(boxes: PageBox[], offset: number) {
  let lo = 0;
  let hi = boxes.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (boxes[mid].top <= offset) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

// ── React glue ──────────────────────────────────────────────────────────────

/** One controller per mounted preview, torn down with it. */
export function usePreviewScrollSync() {
  const sync = useMemo(() => new PreviewScrollSync(), []);
  useEffect(() => () => sync.destroy(), [sync]);
  return sync;
}

/** Subscribe to a pane's page / visible range without re-rendering on scroll. */
export function usePaneView(sync: PreviewScrollSync, id: PaneId): PaneView {
  return useSyncExternalStore(
    useCallback((cb) => sync.subscribeView(id, cb), [sync, id]),
    useCallback(() => sync.getView(id), [sync, id]),
  );
}
