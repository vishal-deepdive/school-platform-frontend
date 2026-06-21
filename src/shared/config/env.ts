/**
 * Centralised runtime configuration sourced from Vite env vars.
 * Import from here instead of reading `import.meta.env` directly so the
 * defaults live in one place.
 */
const _raw: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const API_BASE_URL: string = _raw.endsWith("/") ? _raw.slice(0, -1) : _raw;
