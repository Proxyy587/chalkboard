/** Matches `worker.DEFAULT_MODEL` / `schema.chat.ChatRequest`. */
export const DEFAULT_LECTURE_MODEL = "deepseek/deepseek-v3.2";

/** Common OpenRouter-style ids; extend as needed. */
export const LECTURE_MODEL_OPTIONS = [
  DEFAULT_LECTURE_MODEL,
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
] as const;

export function getChalkboardApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_CHALKBOARD_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:8000";
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
      return d.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : String(x))).join("; ");
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
  const res = await fetch(`${base}/generate-lecture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: model.trim() || DEFAULT_LECTURE_MODEL,
      engine: opts?.engine ?? "auto",
      duration: opts?.duration ?? 60,
    }),
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
