import type { Thread as DbThread, ThreadMessage as DbMessage, ThreadVideo as DbVideo } from "@prisma/client";

import type { Thread, ThreadMessage, ThreadVideo } from "@/lib/chalkboard-types";

export type DbThreadFull = DbThread & {
  messages: DbMessage[];
  videos: DbVideo[];
};

export function toClientThread(row: DbThreadFull): Thread {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    duration: row.duration ?? undefined,
    updatedAt: row.updatedAt.getTime(),
    messages: row.messages
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toClientMessage),
    videos: row.videos
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toClientVideo),
  };
}

function toClientMessage(m: DbMessage): ThreadMessage {
  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    createdAt: m.createdAt.getTime(),
  };
}

function toClientVideo(v: DbVideo): ThreadVideo {
  const status = ["queued", "processing", "completed", "failed"].includes(v.status)
    ? (v.status as ThreadVideo["status"])
    : "queued";
  return {
    id: v.id,
    title: v.title,
    createdAt: v.createdAt.getTime(),
    status,
    jobId: v.jobId ?? undefined,
    videoUrl: v.videoUrl,
    error: v.error,
    cached: v.cached,
  };
}

export const threadInclude = {
  messages: true,
  videos: true,
} as const;
