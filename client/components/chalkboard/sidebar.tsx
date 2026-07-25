"use client";

import { Plus, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useChalkboard } from "./chalkboard-context";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { threadIdsSorted, threadsById, deleteThread } = useChalkboard();
  const { data: session } = useSession();

  const email = session?.user?.email;
  const name = session?.user?.name;
  const initial = (name?.[0] ?? email?.[0] ?? "?").toUpperCase();

  return (
    <aside className="mm-sidebar flex h-full min-h-0 w-[200px] shrink-0 flex-col sm:w-[220px]">
      <div className="shrink-0 border-b border-white/10 px-4 py-4">
        <Link href="/" className="group block">
          <p className="mm-brand text-[15px] font-semibold leading-none">
            manimotion
          </p>
          <p className="mt-2 text-[9px] tracking-[0.18em] text-zinc-600 transition-colors group-hover:text-zinc-500">
            STEM · MOTION · DEMO
          </p>
        </Link>
      </div>

      <div className="shrink-0 space-y-1 border-b border-white/10 p-2">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 text-[11px] tracking-[0.08em] transition-colors",
            pathname === "/"
              ? "bg-white/[0.06] text-white"
              : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
          )}
        >
          <Plus className="size-3.5 shrink-0" strokeWidth={1.5} />
          New demo
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 text-[11px] tracking-[0.08em] transition-colors",
            pathname.startsWith("/settings")
              ? "bg-white/[0.06] text-white"
              : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
          )}
        >
          <Settings className="size-3.5 shrink-0" strokeWidth={1.5} />
          Settings
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="mm-label shrink-0 px-4 py-3">Projects</p>
        <nav
          aria-label="Projects"
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2"
        >
          {threadIdsSorted.length === 0 ? (
            <p className="px-2 py-2 text-[11px] leading-relaxed text-zinc-600">
              No projects yet. Try a prompt on the home screen.
            </p>
          ) : (
            threadIdsSorted.map((threadId) => {
              const t = threadsById[threadId];
              if (!t) return null;
              const active = pathname === `/thread/${threadId}`;
              const hasVideo = t.videos.some((v) => v.status === "completed");
              return (
                <div
                  key={threadId}
                  className={cn(
                    "group relative flex items-stretch",
                    active && "bg-white/[0.05]"
                  )}
                >
                  <Link
                    href={`/thread/${threadId}`}
                    className={cn(
                      "min-w-0 flex-1 border-l-2 px-2.5 py-2 transition-colors",
                      active
                        ? "border-l-[var(--mm-accent)] text-zinc-100"
                        : "border-l-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <span className="line-clamp-2 text-[11px] leading-snug">
                      {t.title}
                    </span>
                    <span className="mt-1 block text-[9px] tracking-[0.1em] text-zinc-600">
                      {hasVideo ? "ready" : t.videos.length ? "rendering…" : "draft"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    title="Delete"
                    className="absolute right-1 top-1/2 hidden -translate-y-1/2 p-1.5 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 sm:block"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteThread(threadId);
                      if (active) router.push("/");
                    }}
                  >
                    <Trash2 className="size-3" strokeWidth={1.5} />
                  </button>
                </div>
              );
            })
          )}
        </nav>
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        {email ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="grid size-7 shrink-0 place-items-center border border-white/15 bg-zinc-900 text-[10px] text-zinc-300">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] text-zinc-300">{name || email}</p>
                <p className="truncate text-[9px] text-zinc-600">{email}</p>
              </div>
            </div>
            <button
              type="button"
              className="mm-ghost-btn w-full px-2 py-1.5 text-left text-[10px]"
              onClick={async () => {
                await signOut();
                router.push("/sign-in");
                router.refresh();
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="mm-ghost-btn flex w-full items-center justify-center px-2 py-2 text-[11px]"
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
