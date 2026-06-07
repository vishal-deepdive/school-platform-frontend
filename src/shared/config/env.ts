/**
 * Centralised runtime configuration sourced from Vite env vars.
 * Import from here instead of reading `import.meta.env` directly so the
 * defaults live in one place.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";
