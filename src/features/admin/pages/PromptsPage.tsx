import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, AlertTriangle, WifiOff, ServerOff } from "lucide-react";
import { promptsApi } from "@/features/admin/api/prompts";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { getErrorMessage } from "@/shared/lib/utils";
import type { PromptSummary, PromptRefreshResponse } from "@/features/admin/types";

// ── Live-version result per prompt ────────────────────────────────────────────

interface LiveResult {
  version: number | null;
  is_fallback: boolean;
  source: string;
  reason: string | null;
  label: string | null;
  checked_at: string;
}

function LiveBadge({ r }: { r: LiveResult }) {
  if (r.source === "langfuse" && r.version !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        v{r.version}
        {r.label && (
          <span className="text-xs text-muted-foreground font-normal">
            · {r.label}
          </span>
        )}
      </span>
    );
  }
  if (r.source === "fallback" || r.is_fallback) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Local fallback
        </span>
        {r.reason && (
          <span className="text-[11px] leading-snug text-amber-700/80 dark:text-amber-400/70">
            {r.reason}
          </span>
        )}
      </span>
    );
  }
  if (r.source === "client_unavailable") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <WifiOff className="h-4 w-4 shrink-0" />
        Client unavailable
      </span>
    );
  }
  if (r.source === "local") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <ServerOff className="h-4 w-4 shrink-0" />
        Langfuse not configured
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">—</span>;
}

// ── Per-row component ─────────────────────────────────────────────────────────

function PromptRow({
  prompt,
  liveResult,
  isChecking,
  onCheck,
}: {
  prompt: PromptSummary;
  liveResult: LiveResult | null;
  isChecking: boolean;
  onCheck: (name: string) => void;
}) {
  const moduleLabel = prompt.name.split(".")[0];

  const moduleVariant = {
    rag: "info",
    survey: "success",
    recording: "purple",
    shared: "default",
  }[moduleLabel] as "info" | "success" | "purple" | "default" | undefined;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Prompt name */}
      <td className="px-5 py-3.5">
        <p className="font-mono text-sm font-medium text-foreground leading-tight">
          {prompt.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground capitalize">
          {prompt.type} prompt
        </p>
      </td>

      {/* Module */}
      <td className="px-5 py-3.5">
        <Badge variant={moduleVariant ?? "default"} className="capitalize">
          {moduleLabel}
        </Badge>
      </td>

      {/* Langfuse-stored version (from list endpoint, reflects label in Langfuse) */}
      <td className="px-5 py-3.5">
        {prompt.current_version !== null ? (
          // A version IS published. If is_fallback, the runtime still REJECTED it
          // (e.g. failed integrity) — show the version with the reason so the
          // admin knows their published edit isn't actually being served.
          <div className="space-y-0.5">
            <span
              className={
                prompt.is_fallback
                  ? "inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400"
                  : "text-sm font-medium text-foreground"
              }
            >
              {prompt.is_fallback && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              v{prompt.current_version}
              {prompt.is_fallback && (
                <span className="text-xs font-normal">(rejected)</span>
              )}
            </span>
            {prompt.is_fallback && prompt.fallback_reason && (
              <p className="text-[11px] leading-snug text-amber-700/80 dark:text-amber-400/70">
                {prompt.fallback_reason}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {prompt.fallback_reason ?? "not in Langfuse"}
          </span>
        )}
      </td>

      {/* Live backend version (from refresh endpoint) */}
      <td className="px-5 py-3.5 min-w-[180px]">
        {liveResult ? (
          <div className="space-y-0.5">
            <LiveBadge r={liveResult} />
            <p className="text-[10px] text-muted-foreground/60">
              checked {liveResult.checked_at}
            </p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Action */}
      <td className="px-5 py-3.5 text-right">
        <Button
          variant="outline"
          size="sm"
          loading={isChecking}
          icon={!isChecking ? <RefreshCw className="h-3.5 w-3.5" /> : undefined}
          onClick={() => onCheck(prompt.name)}
          title="Force-fetch live version from Langfuse and show what the backend is currently serving"
        >
          {liveResult ? "Re-check" : "Check live"}
        </Button>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PromptsPage() {
  const [liveResults, setLiveResults] = useState<Record<string, LiveResult>>({});
  const [checkingNames, setCheckingNames] = useState<Set<string>>(new Set());
  const [refreshAllError, setRefreshAllError] = useState<string | null>(null);

  const {
    data: prompts,
    isLoading,
    isError: promptsError,
    error: promptsQueryError,
  } = useQuery({
    queryKey: ["admin", "prompts"],
    queryFn: () => promptsApi.list(),
  });

  const refreshOne = useMutation({
    mutationFn: (name: string) => promptsApi.refresh(name),
  });

  const timestampNow = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handleCheck = useCallback(
    async (name: string) => {
      setCheckingNames((prev) => new Set(prev).add(name));
      try {
        const result: PromptRefreshResponse = await refreshOne.mutateAsync(name);
        setLiveResults((prev) => ({
          ...prev,
          [name]: {
            version: result.version,
            is_fallback: result.is_fallback,
            source: result.source,
            reason: result.reason,
            label: result.label,
            checked_at: timestampNow(),
          },
        }));
      } catch {
        // leave previous result intact; error surfaced by the row's disabled state
      } finally {
        setCheckingNames((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }
    },
    [refreshOne],
  );

  const handleCheckAll = useCallback(async () => {
    if (!prompts) return;
    setRefreshAllError(null);
    // Run all in parallel — each updates independently as it settles
    const errors: string[] = [];
    await Promise.allSettled(
      prompts.map(async (p) => {
        setCheckingNames((prev) => new Set(prev).add(p.name));
        try {
          const result = await promptsApi.refresh(p.name);
          setLiveResults((prev) => ({
            ...prev,
            [p.name]: {
              version: result.version,
              is_fallback: result.is_fallback,
              source: result.source,
              reason: result.reason,
              label: result.label,
              checked_at: timestampNow(),
            },
          }));
        } catch (err) {
          errors.push(`${p.name}: ${getErrorMessage(err)}`);
        } finally {
          setCheckingNames((prev) => {
            const next = new Set(prev);
            next.delete(p.name);
            return next;
          });
        }
      }),
    );
    if (errors.length) {
      setRefreshAllError(`Failed to check ${errors.length} prompt(s): ${errors.join("; ")}`);
    }
  }, [prompts]);

  // Group prompts by module for the section headers
  const grouped = prompts
    ? prompts.reduce<Record<string, PromptSummary[]>>((acc, p) => {
        const mod = p.name.split(".")[0];
        (acc[mod] ??= []).push(p);
        return acc;
      }, {})
    : {};

  const isCheckingAny = checkingNames.size > 0;
  const checkedCount = Object.keys(liveResults).length;
  const totalCount = prompts?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-4">
        {checkedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {checkedCount} / {totalCount} checked
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          loading={isCheckingAny}
          icon={!isCheckingAny ? <RefreshCw className="h-4 w-4" /> : undefined}
          onClick={handleCheckAll}
          disabled={!prompts || isCheckingAny}
        >
          Check all live versions
        </Button>
      </div>

      {refreshAllError && (
        <Alert variant="error">{refreshAllError}</Alert>
      )}

      {isLoading && <ListSkeleton items={4} />}
      {promptsError && <Alert variant="error">{getErrorMessage(promptsQueryError) || "Failed to load prompts."}</Alert>}

      {!isLoading && !promptsError && prompts && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([module, rows]) => (
            <div
              key={module}
              className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
            >
              {/* Module section header */}
              <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {module}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {rows.length}
                </span>
              </div>

              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prompt
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Module
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Langfuse version
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Live backend version
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {rows.map((p) => (
                    <PromptRow
                      key={p.name}
                      prompt={p}
                      liveResult={liveResults[p.name] ?? null}
                      isChecking={checkingNames.has(p.name)}
                      onCheck={handleCheck}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {!isLoading && prompts && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/70">Legend</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Serving from Langfuse
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Serving local fallback (Langfuse unreachable or integrity check failed)
          </span>
          <span className="flex items-center gap-1.5">
            <ServerOff className="h-3.5 w-3.5 text-muted-foreground" />
            Langfuse not configured (LANGFUSE_* env vars not set)
          </span>
        </div>
      )}
    </div>
  );
}
