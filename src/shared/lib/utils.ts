import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const _STATUS_FALLBACKS: Record<number, string> = {
  400: "Invalid request. Please check your input and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  408: "The request timed out. Please try again.",
  409: "This action conflicts with existing data.",
  413: "The file or data you're trying to upload is too large.",
  422: "Please check your input — some fields may be missing or invalid.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again later.",
  503: "The service is temporarily unavailable. Please try again later.",
};

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { status?: number; data?: { detail?: unknown } };
    };
    const detail = axiosError.response?.data?.detail;
    const status = axiosError.response?.status;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      // FastAPI validation error array format
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
    }
    if (detail && typeof detail === "object") {
      return (detail as any).msg || JSON.stringify(detail);
    }

    // Fall back to status-code-specific message when backend sends no detail
    if (status && _STATUS_FALLBACKS[status]) {
      return _STATUS_FALLBACKS[status];
    }
    return "Something went wrong. Please try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.append(key, String(value));
    }
  }
  const result = qs.toString();
  return result ? `?${result}` : "";
}

export function toIndianDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

/** Converts an HTML date input value (YYYY-MM-DD) to DD-MM-YYYY. */
export function isoToIndianDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Converts DD-MM-YYYY to an HTML date input value (YYYY-MM-DD). */
export function indianDateToIso(indian: string): string {
  const [d, m, y] = indian.split("-");
  return `${y}-${m}-${d}`;
}

/** True if the given HTML date input value (YYYY-MM-DD) falls on a Sunday. */
export function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

/** Triggers a browser download of a text/blob file without opening a new tab. */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/markdown",
): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}

/** Triggers a browser download of a Blob (e.g. a CSV returned directly by the API). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Element must be in the DOM for Firefox to honour the click
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Standardizes a class name, e.g., removing spaces before 'th', 'st', 'nd', 'rd'.
 * "10 th" -> "10th", "1 st" -> "1st"
 */
export function formatClassName(name: string): string {
  return name.trim().replace(/(\d+)\s+(th|st|nd|rd)\b/i, "$1$2");
}

/** Returns a numeric weight for sorting class names. */
export function getClassNameWeight(c: string): number {
  const lower = c.toLowerCase();
  if (lower.includes("nursery") || lower.includes("kg") || lower.includes("lkg") || lower.includes("ukg")) return 0;
  const match = c.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return -1;
}

/**
 * Sorts class levels in descending order:
 * "Class 12" -> "Class 1" -> "Nursery"
 */
export function sortClassesDescending(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const weightDiff = getClassNameWeight(b) - getClassNameWeight(a);
    if (weightDiff !== 0) return weightDiff;
    // fallback to alphabetical if weights are the same
    return a.localeCompare(b);
  });
}
