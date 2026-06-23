// `@types/react-syntax-highlighter` types these deep subpaths only as ambient
// `declare module` augmentations inside its index.d.ts. The workspace compiler
// picks those up, but some editor TS-server setups don't pull them in for a
// dynamic `import()` of the subpath — surfacing a spurious TS7016 ("could not
// find a declaration file"). CodeBlock lazy-imports the specific Prism build +
// a single theme by deep path to keep the chunk small, so re-declare just those
// two subpaths here. Resolution then never depends on the editor reaching the
// ambient decls in @types.
declare module "react-syntax-highlighter/dist/esm/prism" {
  import type { ComponentType } from "react";
  import type { SyntaxHighlighterProps } from "react-syntax-highlighter";
  const Prism: ComponentType<SyntaxHighlighterProps>;
  export default Prism;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/one-dark" {
  import type { CSSProperties } from "react";
  const style: Record<string, CSSProperties>;
  export default style;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/one-light" {
  import type { CSSProperties } from "react";
  const style: Record<string, CSSProperties>;
  export default style;
}
