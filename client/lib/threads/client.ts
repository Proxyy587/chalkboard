import type { Thread, ThreadVideo } from "@/lib/chalkboard-types";

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function fetchThreadsFromApi(): Promise<Thread[] | null> {
  const res = await fetch("/api/threads", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load threads");
  const data = await parseJson(res);
  return (data.threads ?? []) as Thread[];
}

export async function createThreadOnApi(input: {
  id?: string;
  title: string;
  model: string;
  duration?: number;
  prompt: string;
}): Promise<Thread | null> {
  const res = await fetch("/api/threads", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.id,
      title: input.title,
      model: input.model,
      duration: input.duration ?? null,
      prompt: input.prompt,
    }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to create thread");
  const data = await parseJson(res);
  return data.thread as Thread;
}

export async function patchThreadOnApi(
  id: string,
  patch: {
    title?: string;
    model?: string;
    duration?: number | null;
    prompt?: string;
    video?: Partial<ThreadVideo> & { id: string };
  }
): Promise<Thread | null> {
  const body: Record<string, unknown> = {};
  if (patch.title != null) body.title = patch.title;
  if (patch.model != null) body.model = patch.model;
  if (patch.duration !== undefined) body.duration = patch.duration ?? null;
  if (patch.prompt != null) body.prompt = patch.prompt;
  if (patch.video) {
    body.video = {
      id: patch.video.id,
      title: patch.video.title,
      status: patch.video.status,
      jobId: patch.video.jobId ?? null,
      videoUrl: patch.video.videoUrl ?? null,
      error: patch.video.error ?? null,
      cached: patch.video.cached,
    };
  }

  const res = await fetch(`/api/threads/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to update thread");
  const data = await parseJson(res);
  return data.thread as Thread;
}

export async function deleteThreadOnApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/threads/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("Failed to delete thread");
  return true;
}
