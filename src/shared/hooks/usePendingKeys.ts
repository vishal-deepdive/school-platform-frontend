import { useState } from "react";

/**
 * Tracks which row keys have an in-flight mutation.
 *
 * A single `useMutation` instance shared across a list of rows (delete a
 * class code, revoke a teacher assignment, resend an invite, ...) only
 * exposes ONE `variables`/`isPending` pair — the latest call. Using
 * `mutation.isPending && mutation.variables === rowId` for per-row busy state
 * is wrong under concurrent clicks: clicking row A then row B while A is
 * still in flight makes A's `variables` stop matching, so A's button
 * re-renders as idle even though its request hasn't resolved — letting the
 * user click it again and fire a second concurrent mutation for the same row.
 *
 * Wire it into the mutation's `onMutate`/`onSettled` and key rows by `has()`:
 *
 *   const pending = usePendingKeys();
 *   const revoke = useMutation({
 *     mutationFn: (id: string) => api.revoke(id),
 *     onMutate: (id) => pending.start(id),
 *     onSettled: (_d, _e, id) => pending.finish(id),
 *   });
 *   <Button loading={pending.has(row.id)} onClick={() => revoke.mutate(row.id)} />
 */
export function usePendingKeys() {
  const [pending, setPending] = useState<Set<string>>(new Set());

  const start = (key: string) =>
    setPending((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  const finish = (key: string) =>
    setPending((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  return { has: (key: string) => pending.has(key), start, finish, size: pending.size };
}
