import { useEffect } from "react";

const SITE_URL = "https://ddai.work";
const SITE_NAME = "DeepDive";

interface SeoProps {
  /** Page title; " — DeepDive" is appended unless it already mentions the brand. */
  title: string;
  description: string;
  /** Route path used for the canonical URL, e.g. "/about". */
  path: string;
  /** Optional JSON-LD structured data injected for this page only. */
  jsonLd?: object | object[];
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (previous === null) el?.remove();
    else el?.setAttribute("content", previous);
  };
}

/**
 * Lightweight per-route SEO for the public pages: keeps the document title,
 * description, canonical URL, and social tags in sync with the route, and
 * restores the index.html defaults on unmount. No dependency needed — the
 * marketing surface is small enough to manage the head directly.
 */
export function Seo({ title, description, path, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME)
      ? title
      : `${title} — ${SITE_NAME}`;
    const url = `${SITE_URL}${path === "/" ? "/" : path}`;

    const previousTitle = document.title;
    document.title = fullTitle;

    const restorers = [
      setMeta("name", "description", description),
      setMeta("property", "og:title", fullTitle),
      setMeta("property", "og:description", description),
      setMeta("property", "og:url", url),
      setMeta("name", "twitter:title", fullTitle),
      setMeta("name", "twitter:description", description),
    ];

    const canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    const previousCanonical = canonical?.getAttribute("href") ?? null;
    canonical?.setAttribute("href", url);

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      restorers.forEach((restore) => restore());
      if (previousCanonical) canonical?.setAttribute("href", previousCanonical);
      script?.remove();
    };
    // jsonLd is intentionally compared by reference only on mount; pages pass
    // module-level constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path]);

  return null;
}
