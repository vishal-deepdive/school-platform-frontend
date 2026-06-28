import { memo, useEffect, useState } from "react";
import { AlertTriangle, Code2, Workflow } from "lucide-react";
import { useIsDark } from "@/shared/hooks/useIsDark";
import { CodeBlock } from "./CodeBlock";

interface MermaidDiagramProps {
  /** Raw Mermaid source from a ```mermaid fenced block. */
  chart: string;
}

type MermaidModule = typeof import("mermaid")["default"];

let mermaidPromise: Promise<MermaidModule> | null = null;
function loadMermaid(): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

// Module-scoped counter for collision-free render ids (Math.random not needed).
let renderSeq = 0;

/**
 * Renders a Mermaid diagram from a ```mermaid code fence.
 *
 * Mermaid (~loaded lazily) is initialised with `securityLevel: "strict"` so
 * model- or document-derived diagram text can't inject scripts; the SVG it
 * returns is already DOMPurify-sanitised internally. If the source fails to
 * parse — common with partial or malformed output — we fall back to showing
 * the raw source as a code block instead of crashing the message.
 */
export const MermaidDiagram = memo(function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const isDark = useIsDark();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDark ? "dark" : "default",
          fontFamily: "inherit",
        });
        const { svg: rendered } = await mermaid.render(`mermaid-${++renderSeq}`, chart);
        if (!cancelled) setSvg(rendered);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not render this diagram.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  if (error) {
    return (
      <div className="not-prose my-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Couldn&apos;t render diagram — showing source.
        </div>
        <CodeBlock language="mermaid" value={chart} />
      </div>
    );
  }

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="flex select-none items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Workflow className="h-3.5 w-3.5 text-primary" />
          Diagram
        </span>
        <button
          type="button"
          onClick={() => setShowSource((s) => !s)}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Code2 className="h-3.5 w-3.5" />
          {showSource ? "Diagram" : "Source"}
        </button>
      </div>

      {showSource ? (
        <CodeBlock language="mermaid" value={chart} />
      ) : svg ? (
        <div
          className="scrollbar-thin flex justify-center overflow-auto p-4 [&_svg]:h-auto [&_svg]:max-w-full"
          // SVG is sanitised by Mermaid (securityLevel: "strict") before it reaches here.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Workflow className="h-4 w-4 animate-pulse text-primary" />
          Rendering diagram…
        </div>
      )}
    </div>
  );
});
