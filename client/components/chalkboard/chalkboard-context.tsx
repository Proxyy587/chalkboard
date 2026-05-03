"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  createLectureJob,
  DEFAULT_LECTURE_MODEL,
  fetchJobStatus,
  sleep,
} from "@/lib/chalkboard-api";
import type { Thread, ThreadMessage, ThreadVideo, ThreadVideoStatus } from "@/lib/chalkboard-types";
import {
  normalizeThread,
  STORAGE_KEY,
} from "@/lib/chalkboard-types";

const LEGACY_STORAGE_KEY = "chalkboard-threads-v1";

function uid() {
  return crypto.randomUUID();
}

function truncateTitle(text: string, max = 42) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t || "Untitled";
  return t.slice(0, max - 1) + "…";
}

function loadThreads(): Record<string, Thread> {
  if (typeof window === "undefined") return {};
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, Thread> = {};
    for (const [, v] of Object.entries(parsed)) {
      const t = normalizeThread(v);
      if (t) out[t.id] = t;
    }
    return out;
  } catch {
    return {};
  }
}

function saveThreads(map: Record<string, Thread>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota */
  }
}

function persistThreads(
  prev: Record<string, Thread>,
  updater: (p: Record<string, Thread>) => Record<string, Thread>
): Record<string, Thread> {
  const next = updater(prev);
  saveThreads(next);
  return next;
}

function coerceJobStatus(status: string): ThreadVideoStatus {
  if (
    status === "queued" ||
    status === "processing" ||
    status === "completed" ||
    status === "failed"
  ) {
    return status;
  }
  return "processing";
}

function shortJobTitle(jobId: string) {
  return `Job ${jobId.slice(0, 8)}`;
}

type ChalkboardContextValue = {
  hydrated: boolean;
  threadsById: Record<string, Thread>;
  threadIdsSorted: string[];
  getThread: (id: string) => Thread | undefined;
  createThreadFromPrompt: (prompt: string) => string;
  appendUserMessage: (threadId: string, content: string) => void;
  setThreadModel: (threadId: string, model: string) => void;
  startLectureRender: (threadId: string) => Promise<void>;
};

const ChalkboardContext = createContext<ChalkboardContextValue | null>(null);

export function ChalkboardProvider({ children }: { children: ReactNode }) {
  const [threadsById, setThreadsById] = useState<Record<string, Thread>>({});
  const [hydrated, setHydrated] = useState(false);

  useMountEffect(() => {
    setThreadsById(loadThreads());
    setHydrated(true);
  });

  const threadIdsSorted = useMemo(() => {
    return Object.keys(threadsById).sort(
      (a, b) =>
        threadsById[b].updatedAt - threadsById[a].updatedAt
    );
  }, [threadsById]);

  const getThread = useCallback(
    (id: string) => threadsById[id],
    [threadsById]
  );

  const patchVideo = useCallback(
    (threadId: string, videoId: string, patch: Partial<ThreadVideo>) => {
      setThreadsById((prev) =>
        persistThreads(prev, (p) => {
          const t = p[threadId];
          if (!t) return p;
          return {
            ...p,
            [threadId]: {
              ...t,
              videos: t.videos.map((v) =>
                v.id === videoId ? { ...v, ...patch } : v
              ),
              updatedAt: Date.now(),
            },
          };
        })
      );
    },
    []
  );

  const createThreadFromPrompt = useCallback((prompt: string) => {
    const id = uid();
    const now = Date.now();
    const userMsg: ThreadMessage = {
      id: uid(),
      role: "user",
      content: prompt.trim(),
      createdAt: now,
    };
    const assistantMsg: ThreadMessage = {
      id: uid(),
      role: "assistant",
      content:
        "Choose the LLM model below, then press RENDER. The API runs Manim, audio, and uploads the MP4 to R2 — the canvas will show the stream URL when ready.",
      createdAt: now + 1,
    };
    const thread: Thread = {
      id,
      title: truncateTitle(prompt),
      messages: [userMsg, assistantMsg],
      videos: [],
      model: DEFAULT_LECTURE_MODEL,
      updatedAt: now,
    };
    setThreadsById((prev) =>
      persistThreads(prev, (p) => ({ ...p, [id]: thread }))
    );
    return id;
  }, []);

  const appendUserMessage = useCallback((threadId: string, content: string) => {
    const text = content.trim();
    if (!text) return;
    const msg: ThreadMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setThreadsById((prev) =>
      persistThreads(prev, (p) => {
        const t = p[threadId];
        if (!t) return p;
        return {
          ...p,
          [threadId]: {
            ...t,
            messages: [
              ...t.messages,
              msg,
              {
                id: uid(),
                role: "assistant",
                content:
                  "Noted. The server uses your latest user message as the lecture topic when you RENDER.",
                createdAt: Date.now() + 1,
              },
            ],
            updatedAt: Date.now(),
          },
        };
      })
    );
  }, []);

  const setThreadModel = useCallback((threadId: string, model: string) => {
    const m = model.trim() || DEFAULT_LECTURE_MODEL;
    setThreadsById((prev) =>
      persistThreads(prev, (p) => {
        const t = p[threadId];
        if (!t) return p;
        return {
          ...p,
          [threadId]: { ...t, model: m, updatedAt: Date.now() },
        };
      })
    );
  }, []);

  const startLectureRender = useCallback(
    async (threadId: string) => {
      const t = getThread(threadId);
      if (!t) return;

      const messages = t.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const lastUser = [...t.messages].reverse().find((m) => m.role === "user");
      if (!lastUser?.content.trim()) return;

      const videoId = uid();
      const placeholder: ThreadVideo = {
        id: videoId,
        title: "Starting…",
        createdAt: Date.now(),
        status: "queued",
      };

      setThreadsById((prev) =>
        persistThreads(prev, (p) => {
          const th = p[threadId];
          if (!th) return p;
          return {
            ...p,
            [threadId]: {
              ...th,
              videos: [placeholder, ...th.videos],
              updatedAt: Date.now(),
            },
          };
        })
      );

      try {
        const data = await createLectureJob(messages, t.model);
        patchVideo(threadId, videoId, {
          jobId: data.job_id,
          title: shortJobTitle(data.job_id),
          status: coerceJobStatus(data.status),
          videoUrl: data.video_url ?? undefined,
          cached: Boolean(data.cached),
          error: null,
        });

        if (data.status === "completed") return;

        for (;;) {
          await sleep(2500);
          try {
            const st = await fetchJobStatus(data.job_id);
            patchVideo(threadId, videoId, {
              status: coerceJobStatus(st.status),
              videoUrl: st.video_url ?? undefined,
              error: st.error ?? null,
              cached: Boolean(st.cached),
            });
            if (st.status === "completed" || st.status === "failed") break;
          } catch (pollErr) {
            const msg =
              pollErr instanceof Error ? pollErr.message : String(pollErr);
            patchVideo(threadId, videoId, {
              status: "failed",
              error: msg,
            });
            break;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        patchVideo(threadId, videoId, {
          status: "failed",
          error: msg,
          title: "Failed",
        });
      }
    },
    [getThread, patchVideo]
  );

  const value = useMemo(
    (): ChalkboardContextValue => ({
      hydrated,
      threadsById,
      threadIdsSorted,
      getThread,
      createThreadFromPrompt,
      appendUserMessage,
      setThreadModel,
      startLectureRender,
    }),
    [
      hydrated,
      threadsById,
      threadIdsSorted,
      getThread,
      createThreadFromPrompt,
      appendUserMessage,
      setThreadModel,
      startLectureRender,
    ]
  );

  return (
    <ChalkboardContext.Provider value={value}>
      {children}
    </ChalkboardContext.Provider>
  );
}

export function useChalkboard() {
  const ctx = useContext(ChalkboardContext);
  if (!ctx) throw new Error("useChalkboard must be used within ChalkboardProvider");
  return ctx;
}
