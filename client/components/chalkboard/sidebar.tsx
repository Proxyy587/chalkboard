"use client";

import { MessageSquarePlus, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { useChalkboard } from "./chalkboard-context";

export function Sidebar() {
  const pathname = usePathname();
  const { threadIdsSorted, threadsById } = useChalkboard();

  return (
    <aside className="chalk-panel flex h-full min-h-0 w-[220px] shrink-0 flex-col border-white/10 md:border-r">
      <div className="shrink-0 border-b border-white/10 p-4">
        <Link href="/" className="block">
          <p className="chalk-brand text-lg font-semibold italic tracking-tight">
            CHALKBOARD
          </p>
          <p className="mt-1 text-[10px] tracking-[0.16em] text-zinc-600">
            LECTURE_OS V1.0.2
          </p>
        </Link>
      </div>

      <div className="shrink-0 space-y-1 border-b border-white/10 p-2">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 border px-3 py-2.5 text-[10px] tracking-[0.14em] transition-colors duration-200",
            pathname === "/"
              ? "border-white/10 bg-white/[0.04] text-[#dfff00]"
              : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.02] hover:text-zinc-300"
          )}
        >
          <Plus className="size-3.5 shrink-0" strokeWidth={1.5} />
          NEW_LECTURE
        </Link>
        <button
          type="button"
          className="flex w-full items-center gap-2 border border-transparent px-3 py-2.5 text-left text-[10px] tracking-[0.14em] text-zinc-600 transition-colors duration-200 hover:border-white/10 hover:text-zinc-400"
        >
          <Settings className="size-3.5 shrink-0" strokeWidth={1.5} />
          SETTINGS
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <p className="shrink-0 px-2 py-2 text-[10px] tracking-[0.18em] text-zinc-600">
          THREADS
        </p>
        <nav
          aria-label="Threads"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-1 pr-0.5"
        >
          {threadIdsSorted.length === 0 ? (
            <p className="px-2 py-3 text-[10px] leading-relaxed text-zinc-600">
              No threads yet. Start from home.
            </p>
          ) : (
            threadIdsSorted.map((threadId) => {
              const t = threadsById[threadId];
              if (!t) return null;
              const active = pathname === `/thread/${threadId}`;
              const n = t.videos.length;
              return (
                <Link
                  key={threadId}
                  href={`/thread/${threadId}`}
                  className={cn(
                    "flex flex-col border-l-2 px-2 py-2 transition-colors duration-200",
                    active
                      ? "border-l-[#dfff00] bg-white/[0.04] text-zinc-200"
                      : "border-l-transparent text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300"
                  )}
                >
                  <span className="flex items-start gap-2">
                    <MessageSquarePlus
                      className={cn(
                        "mt-0.5 size-3 shrink-0",
                        active ? "text-[#dfff00]" : "text-zinc-600"
                      )}
                      strokeWidth={1.5}
                    />
                    <span className="line-clamp-2 flex-1 text-[10px] leading-snug tracking-[0.06em]">
                      {t.title}
                    </span>
                  </span>
                  <span className="mt-1 pl-5 text-[9px] tracking-[0.1em] text-zinc-600">
                    {n === 0 ? "No renders" : `${n} render${n === 1 ? "" : "s"}`}
                  </span>
                </Link>
              );
            })
          )}
        </nav>
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-2 border border-white/10 bg-black/40 px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center border border-white/15 bg-zinc-900 text-[10px] text-zinc-400">
            U
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] tracking-[0.12em] text-zinc-400">
              LOCAL_SESSION
            </p>
            <p className="truncate text-[9px] text-zinc-600">Saved in browser</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
