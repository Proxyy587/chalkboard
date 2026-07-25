/** Matches `worker.DEFAULT_MODEL` / `schema.chat.ChatRequest`. */
export const DEFAULT_LECTURE_MODEL = "deepseek/deepseek-v3.2";

export type LectureModelOption = {
  id: string;
  label: string;
  hint: string;
};

/** OpenRouter-style ids with human labels for the selector. */
export const LECTURE_MODELS: LectureModelOption[] = [
  {
    id: "deepseek/deepseek-v3.2",
    label: "DeepSeek V3.2",
    hint: "Fast · strong for math",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    hint: "Balanced · clear narration",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    hint: "Careful · explanatory",
  },
  {
    id: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    hint: "Quick · exploratory",
  },
];

export const LECTURE_MODEL_OPTIONS = LECTURE_MODELS.map((m) => m.id);

export const DURATION_OPTIONS = [
  { value: undefined as number | undefined, label: "Auto length" },
  { value: 30, label: "≈ 30s" },
  { value: 60, label: "≈ 1 min" },
  { value: 90, label: "≈ 90s" },
  { value: 120, label: "≈ 2 min" },
] as const;

const PREF_MODEL_KEY = "manimotion_pref_model";
const PREF_DURATION_KEY = "manimotion_pref_duration";

export function getPreferredModel(): string {
  if (typeof window === "undefined") return DEFAULT_LECTURE_MODEL;
  const raw = localStorage.getItem(PREF_MODEL_KEY)?.trim();
  if (raw && LECTURE_MODELS.some((m) => m.id === raw)) return raw;
  return DEFAULT_LECTURE_MODEL;
}

export function setPreferredModel(model: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_MODEL_KEY, model);
}

export function getPreferredDuration(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(PREF_DURATION_KEY);
  if (raw == null || raw === "" || raw === "auto") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function setPreferredDuration(duration: number | undefined) {
  if (typeof window === "undefined") return;
  if (duration == null) localStorage.setItem(PREF_DURATION_KEY, "auto");
  else localStorage.setItem(PREF_DURATION_KEY, String(duration));
}

export function getModelLabel(id: string): string {
  return LECTURE_MODELS.find((m) => m.id === id)?.label ?? id;
}

export function getChalkboardApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_CHALKBOARD_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:8000";
}

/** User API key from Settings (browser localStorage). */
export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("chalk_api_key");
}

export function setStoredApiKey(key: string | null) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem("chalk_api_key", key);
  else localStorage.removeItem("chalk_api_key");
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = getStoredApiKey();
  if (key) headers["x-api-key"] = key;
  return headers;
}

export type ApiMessage = { role: string; content: string };

export type JobCreateResponse = {
  job_id: string;
  status: string;
  cached?: boolean;
  video_url?: string | null;
};

export type JobStatusResponse = {
  job_id: string;
  status: string;
  video_url?: string | null;
  error?: string | null;
  cached?: boolean;
};

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d))
      return d
        .map((x) =>
          typeof x === "object" && x && "msg" in x
            ? String((x as { msg: string }).msg)
            : String(x)
        )
        .join("; ");
    return res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function createLectureJob(
  messages: ApiMessage[],
  model: string,
  opts?: { engine?: "auto" | "manim" | "remotion"; duration?: number }
): Promise<JobCreateResponse> {
  const base = getChalkboardApiBase();
  const body: Record<string, unknown> = {
    messages,
    model: model.trim() || DEFAULT_LECTURE_MODEL,
    engine: opts?.engine ?? "auto",
  };
  if (opts?.duration != null) body.duration = opts.duration;

  const res = await fetch(`${base}/generate-lecture`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<JobCreateResponse>;
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  const base = getChalkboardApiBase();
  const res = await fetch(`${base}/jobs/${jobId}`);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<JobStatusResponse>;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
