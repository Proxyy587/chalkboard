/** Safe internal redirect paths (open-redirect protection). */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/"
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  return trimmed;
}

export function nextFromSearchParams(
  searchParams: URLSearchParams | { get(name: string): string | null },
  fallback = "/"
): string {
  return safeNextPath(searchParams.get("next"), fallback);
}
