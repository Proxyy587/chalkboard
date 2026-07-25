import { DEFAULT_LECTURE_MODEL } from "@/lib/chalkboard-api";

export type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

/** Aligns with FastAPI job `status` values. */
export type ThreadVideoStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ThreadVideo = {
  id: string;
  title: string;
  createdAt: number;
  status: ThreadVideoStatus;
  jobId?: string;
  videoUrl?: string | null;
  error?: string | null;
  cached?: boolean;
};

export type Thread = {
  id: string;
  title: string;
  messages: ThreadMessage[];
  videos: ThreadVideo[];
  /** LLM model id sent to `/generate-lecture`. */
  model: string;
  /** Optional target duration in seconds; omit for auto. */
  duration?: number;
  updatedAt: number;
};

export const STORAGE_KEY = "chalkboard-threads-v2";

/** Best-effort migration from older persisted shapes. */
export function normalizeThread(raw: unknown): Thread | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<Thread>;
  if (typeof t.id !== "string" || !Array.isArray(t.messages)) return null;
  const model =
    typeof t.model === "string" && t.model.trim()
      ? t.model
      : DEFAULT_LECTURE_MODEL;
  const videos: ThreadVideo[] = Array.isArray(t.videos)
    ? t.videos
        .map(normalizeVideo)
        .filter((v): v is ThreadVideo => v != null)
    : [];
  return {
    id: t.id,
    title: typeof t.title === "string" ? t.title : "Untitled",
    messages: t.messages as ThreadMessage[],
    videos,
    model,
    duration: typeof t.duration === "number" ? t.duration : undefined,
    updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
  };
}

function normalizeVideo(raw: unknown): ThreadVideo | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<ThreadVideo>;
  if (typeof v.id !== "string") return null;
  let status = v.status as ThreadVideoStatus | undefined;
  if (status === ("ready" as never)) status = "completed";
  if (status === ("rendering" as never)) status = "processing";
  if (
    !status ||
    !["queued", "processing", "completed", "failed"].includes(status)
  ) {
    status = "queued";
  }
  return {
    id: v.id,
    title: typeof v.title === "string" ? v.title : "Render",
    createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.now(),
    status,
    jobId: typeof v.jobId === "string" ? v.jobId : undefined,
    videoUrl: v.videoUrl ?? undefined,
    error: v.error ?? undefined,
    cached: Boolean(v.cached),
  };
}
