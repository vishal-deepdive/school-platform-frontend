import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promptsApi } from "@/features/admin/api/prompts";
import { getErrorMessage } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { PageSpinner, Spinner } from "@/shared/components/ui/Spinner";
import type {
  PromptDetail,
  PromptMessage,
  PromptSummary,
} from "@/features/admin/types";

const inputCls =
  "w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

// ── Prompt list (grouped by module) ─────────────────────────────────────────

function PromptList({
  prompts,
  selected,
  onSelect,
}: {
  prompts: PromptSummary[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, PromptSummary[]>();
    for (const p of prompts) {
      const arr = m.get(p.module);
      if (arr) arr.push(p);
      else m.set(p.module, [p]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [prompts]);

  return (
    <div className="space-y-5">
      {grouped.map(([module, items]) => (
        <div key={module}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {module}
          </h3>
          <div className="space-y-1">
            {items.map((p) => (
              <button
                key={p.name}
                onClick={() => onSelect(p.name)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected === p.name
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="font-mono">{p.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {p.current_version != null ? `v${p.current_version}` : "local"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Version history + rollback ───────────────────────────────────────────────

function VersionHistory({
  detail,
  onRollback,
  rollingBack,
  disabled,
}: {
  detail: PromptDetail;
  onRollback: (version: number) => void;
  rollingBack: number | null;
  disabled: boolean;
}) {
  if (!detail.versions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No version history yet{detail.langfuse_enabled ? "" : " (Langfuse not configured)"}.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {detail.versions.map((v) => {
        const isProd = v.labels.includes("production");
        return (
          <li key={v.version} className="flex items-center justify-between px-4 py-2.5">
            <div className="text-sm">
              <span className="font-medium text-foreground">v{v.version}</span>
              {v.labels.map((l) => (
                <span
                  key={l}
                  className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                    l === "production"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {l}
                </span>
              ))}
              {v.config?.model ? (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {String(v.config.model)}
                </span>
              ) : null}
            </div>
            {isProd ? (
              <span className="text-xs italic text-muted-foreground">current</span>
            ) : (
              <button
                onClick={() => onRollback(v.version)}
                disabled={disabled || rollingBack != null}
                className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {rollingBack === v.version ? "Rolling back…" : "Roll back"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Editor ─────────────────────────────────────────────────────────────────

function PromptEditor({ name }: { name: string }) {
  const queryClient = useQueryClient();
  const {
    data: detail,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "prompt", name],
    queryFn: () => promptsApi.detail(name),
  });

  const [messages, setMessages] = useState<PromptMessage[]>([]);
  const [text, setText] = useState("");
  const [model, setModel] = useState<string | undefined>(undefined);
  const [temperature, setTemperature] = useState<string>("");
  const [maxTokens, setMaxTokens] = useState<string>("");

  // Re-seed local editor state whenever a (different) prompt loads.
  useEffect(() => {
    if (!detail) return;
    setMessages(detail.messages ? detail.messages.map((m) => ({ ...m })) : []);
    setText(detail.text ?? "");
    setModel(detail.config.model as string | undefined);
    setTemperature(
      detail.config.temperature != null ? String(detail.config.temperature) : "",
    );
    setMaxTokens(
      detail.config.max_tokens != null ? String(detail.config.max_tokens) : "",
    );
  }, [detail]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, number | string> = {};
      if (detail?.config.model !== undefined && model) config.model = model;
      if (detail?.config.temperature !== undefined && temperature !== "")
        config.temperature = Number(temperature);
      if (detail?.config.max_tokens !== undefined && maxTokens !== "")
        config.max_tokens = Number(maxTokens);
      return promptsApi.save(name, {
        ...(detail?.type === "chat" ? { messages } : { text }),
        config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "prompt", name] });
      queryClient.invalidateQueries({ queryKey: ["admin", "prompts"] });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (version: number) => promptsApi.rollback(name, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "prompt", name] });
      queryClient.invalidateQueries({ queryKey: ["admin", "prompts"] });
    },
  });

  if (isLoading) return <PageSpinner />;
  if (error || !detail)
    return <Alert variant="error">Failed to load “{name}”.</Alert>;

  const readOnly = !detail.langfuse_enabled;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-mono text-lg font-semibold text-foreground">{detail.name}</h2>
        <p className="text-sm text-muted-foreground">
          {detail.module} · {detail.type}
          {detail.current_version != null ? ` · production v${detail.current_version}` : ""}
        </p>
      </div>

      {readOnly && (
        <Alert variant="warning">
          Langfuse is not configured, so this prompt is served from the in-code
          fallback. Editing, history and rollback are disabled until LANGFUSE_* is set.
        </Alert>
      )}

      {/* Variable + token contract hints */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
        <p className="text-muted-foreground">
          Available variables (use as <code>{"{{name}}"}</code>):
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {detail.variables.length ? (
            detail.variables.map((v) => (
              <code key={v} className="rounded bg-background px-1.5 py-0.5 text-primary">
                {`{{${v}}}`}
              </code>
            ))
          ) : (
            <span className="text-muted-foreground">none</span>
          )}
        </div>
        {detail.sentinels.length > 0 && (
          <p className="mt-2 text-amber-600 dark:text-amber-500">
            Must remain in the text (parsed by the app):{" "}
            {detail.sentinels.map((s) => (
              <code key={s} className="mr-1 rounded bg-background px-1.5 py-0.5">
                {s}
              </code>
            ))}
          </p>
        )}
      </div>

      {/* Body editor */}
      {detail.type === "chat" ? (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.role}
              </label>
              <textarea
                value={m.content}
                disabled={readOnly}
                onChange={(e) =>
                  setMessages((prev) =>
                    prev.map((pm, j) => (j === i ? { ...pm, content: e.target.value } : pm)),
                  )
                }
                rows={Math.min(20, Math.max(4, m.content.split("\n").length + 1))}
                className={`${inputCls} font-mono leading-relaxed disabled:opacity-60`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            text
          </label>
          <textarea
            value={text}
            disabled={readOnly}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(24, Math.max(6, text.split("\n").length + 1))}
            className={`${inputCls} font-mono leading-relaxed disabled:opacity-60`}
          />
        </div>
      )}

      {/* Config */}
      {(detail.config.model !== undefined ||
        detail.config.temperature !== undefined ||
        detail.config.max_tokens !== undefined) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {detail.config.model !== undefined && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Model</label>
              <select
                value={model ?? ""}
                disabled={readOnly}
                onChange={(e) => setModel(e.target.value)}
                className={`${inputCls} disabled:opacity-60`}
              >
                {detail.allowed_models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {detail.config.provider ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  provider: {String(detail.config.provider)}
                </p>
              ) : null}
            </div>
          )}
          {detail.config.temperature !== undefined && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Temperature (0–2)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={temperature}
                disabled={readOnly}
                onChange={(e) => setTemperature(e.target.value)}
                className={`${inputCls} disabled:opacity-60`}
              />
            </div>
          )}
          {detail.config.max_tokens !== undefined && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Max tokens</label>
              <input
                type="number"
                min={1}
                max={16000}
                value={maxTokens}
                disabled={readOnly}
                onChange={(e) => setMaxTokens(e.target.value)}
                className={`${inputCls} disabled:opacity-60`}
              />
            </div>
          )}
        </div>
      )}

      {saveMutation.isError && (
        <Alert variant="error">{getErrorMessage(saveMutation.error)}</Alert>
      )}
      {saveMutation.isSuccess && (
        <Alert variant="success">{saveMutation.data.message}</Alert>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={readOnly || saveMutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saveMutation.isPending ? "Publishing…" : "Publish new version"}
        </button>
        {saveMutation.isPending && <Spinner />}
      </div>

      {/* History */}
      <div className="pt-2">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Version history</h3>
        {rollbackMutation.isError && (
          <Alert variant="error">{getErrorMessage(rollbackMutation.error)}</Alert>
        )}
        <VersionHistory
          detail={detail}
          disabled={readOnly}
          rollingBack={rollbackMutation.isPending ? rollbackMutation.variables ?? null : null}
          onRollback={(v) => rollbackMutation.mutate(v)}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PromptsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ["admin", "prompts"],
    queryFn: () => promptsApi.list(),
  });

  useEffect(() => {
    if (!selected && prompts && prompts.length) setSelected(prompts[0].name);
  }, [prompts, selected]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prompt Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit, version and roll back the LLM prompts used across RAG, Survey and
          Recording. Changes publish to the production label and take effect within
          the cache TTL.
        </p>
      </div>

      {error && <Alert variant="error">Failed to load prompts.</Alert>}
      {isLoading && <PageSpinner />}

      {!isLoading && prompts && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <PromptList prompts={prompts} selected={selected} onSelect={setSelected} />
          </aside>
          <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
            {selected ? (
              <PromptEditor name={selected} />
            ) : (
              <p className="text-sm text-muted-foreground">Select a prompt to edit.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
