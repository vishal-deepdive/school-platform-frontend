/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once, so a
 * bulk UI action (select N rows, retry/refresh all) sends bounded waves of
 * requests instead of firing all N in parallel — the backend rate limiter
 * sizes its per-minute tiers for normal usage, not an unbounded client burst.
 *
 * Settles like `Promise.allSettled` (one rejection never aborts the rest);
 * results are returned in the same order as `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        const value = await fn(items[index], index);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
