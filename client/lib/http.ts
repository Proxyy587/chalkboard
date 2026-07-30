/** Parse JSON from a Response without throwing on empty / non-JSON bodies. */
export async function readJsonSafe<T extends object = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 240) || `HTTP ${res.status}` } as unknown as T;
  }
}
