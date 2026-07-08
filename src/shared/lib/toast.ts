/**
 * App-wide toast API.
 *
 * Thin re-export of sonner's `toast` so the rest of the codebase depends on an
 * internal module rather than the library directly — the implementation can be
 * swapped here without touching call sites. Supports `toast.success`,
 * `toast.error`, `toast.warning`, `toast.info`, `toast.loading`,
 * `toast.promise`, `toast.message` and `toast.dismiss`.
 *
 * The <Toaster> that renders these lives in `shared/components/ui/Toaster.tsx`
 * (mounted once in AppProviders) and is themed in index.css.
 */
import { toast } from "sonner";

export { toast };
export default toast;
