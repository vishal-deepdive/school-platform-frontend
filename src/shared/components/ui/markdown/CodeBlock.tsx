import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Copy } from "lucide-react";
import { useIsDark } from "@/shared/hooks/useIsDark";
import { cn } from "@/shared/lib/utils";

interface CodeBlockProps {
  /** Lower-cased language token from the fence (e.g. "python"), if any. */
  language?: string;
  /** Raw code text, with the trailing newline already stripped. */
  value: string;
  /**
   * When false, render the code as plain (unhighlighted) text. Used while a
   * message is still streaming so we don't re-tokenise a growing block on every
   * frame — highlighting kicks in once the response is complete.
   */
  highlight?: boolean;
}

type PrismComponent = (typeof import("react-syntax-highlighter/dist/esm/prism"))["default"];
type Theme = Record<string, CSSProperties>;
type Highlighter = { Prism: PrismComponent; theme: Theme };

/**
 * Lazily loads the Prism build (once) plus the light/dark theme on demand, then
 * caches each. Keeps `react-syntax-highlighter` (a few hundred KB) out of the
 * initial bundle — it ships in its own chunk fetched only when a response
 * actually contains a code block.
 */
let prismPromise: Promise<PrismComponent> | null = null;
const themePromises: { dark?: Promise<Theme>; light?: Promise<Theme> } = {};

function loadPrism(): Promise<PrismComponent> {
  prismPromise ??= import("react-syntax-highlighter/dist/esm/prism").then((m) => m.default);
  return prismPromise;
}

function loadTheme(dark: boolean): Promise<Theme> {
  if (dark) {
    themePromises.dark ??= import(
      "react-syntax-highlighter/dist/esm/styles/prism/one-dark"
    ).then((m) => m.default);
    return themePromises.dark;
  }
  themePromises.light ??= import(
    "react-syntax-highlighter/dist/esm/styles/prism/one-light"
  ).then((m) => m.default);
  return themePromises.light;
}

function loadHighlighter(dark: boolean): Promise<Highlighter> {
  return Promise.all([loadPrism(), loadTheme(dark)]).then(([Prism, theme]) => ({ Prism, theme }));
}

// A handful of friendly display labels; anything else is shown verbatim.
const LANGUAGE_LABELS: Record<string, string> = {
  js: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Bash",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  md: "Markdown",
  cpp: "C++",
  cs: "C#",
  csharp: "C#",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  text: "Text",
  plaintext: "Text",
};

const CODE_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Renders a fenced code block with a header (language label + copy button) and
 * a syntax-highlighted body that follows the app theme (one-light / one-dark).
 *
 * Wrapped in `not-prose` so Tailwind Typography's `pre`/`code` rules don't fight
 * the highlighter's inline token colours.
 */
export const CodeBlock = memo(function CodeBlock({
  language,
  value,
  highlight = true,
}: CodeBlockProps) {
  const isDark = useIsDark();
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load (and re-load on theme change) only when highlighting is enabled.
  useEffect(() => {
    if (!highlight) {
      setHighlighter(null);
      return;
    }
    let active = true;
    loadHighlighter(isDark).then((h) => {
      if (active) setHighlighter(h);
    });
    return () => {
      active = false;
    };
  }, [highlight, isDark]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  const label = language ? (LANGUAGE_LABELS[language] ?? language) : "Code";
  const showHighlighted = highlight && highlighter;
  const Prism = highlighter?.Prism;

  return (
    <div
      className={cn(
        "not-prose my-3 overflow-hidden rounded-xl border text-[0.8125rem] shadow-sm",
        isDark ? "border-white/10 bg-[#282c34]" : "border-slate-200 bg-[#fafafa]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-3 py-1.5",
          isDark ? "border-white/10" : "border-slate-200",
        )}
      >
        <span
          className={cn(
            "select-none text-xs font-medium uppercase tracking-wide",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors",
            isDark
              ? "text-slate-400 hover:bg-white/10 hover:text-slate-200"
              : "text-slate-500 hover:bg-black/5 hover:text-slate-800",
          )}
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="scrollbar-thin max-h-[28rem] overflow-auto">
        {showHighlighted && Prism ? (
          <Prism
            language={language || "text"}
            style={highlighter.theme}
            customStyle={{
              margin: 0,
              padding: "0.875rem 1rem",
              background: "transparent",
              fontSize: "inherit",
              lineHeight: 1.6,
            }}
            codeTagProps={{ style: { fontFamily: CODE_FONT } }}
            PreTag="div"
          >
            {value}
          </Prism>
        ) : (
          // Plain, readable body — shown while streaming or before the
          // highlighter chunk loads.
          <pre
            className={cn(
              "m-0 px-4 py-3.5 leading-relaxed",
              isDark ? "text-slate-100" : "text-slate-800",
            )}
            style={{ fontFamily: CODE_FONT }}
          >
            {value}
          </pre>
        )}
      </div>
    </div>
  );
});
