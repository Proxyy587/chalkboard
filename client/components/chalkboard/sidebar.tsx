"use client";

import { BookOpen, Plus, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useChalkboard } from "./chalkboard-context";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { threadIdsSorted, threadsById, deleteThread } = useChalkboard();
  const { data: session } = useSession();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    active: boolean;
  } | null>(null);

  const email = session?.user?.email;
  const name = session?.user?.name;
  const initial = (name?.[0] ?? email?.[0] ?? "?").toUpperCase();

  const nav = [
    { href: "/", label: "New", icon: Plus, match: (p: string) => p === "/" },
    {
      href: "/docs",
      label: "Docs",
      icon: BookOpen,
      match: (p: string) => p.startsWith("/docs"),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      match: (p: string) => p.startsWith("/settings"),
    },
  ];

  return (
    <aside className="mm-sidebar flex h-full min-h-0 w-[220px] shrink-0 flex-col">
      <div className="shrink-0 border-b border-white/10 px-4 py-4">
        <Link href="/" className="block">
          <p className="mm-brand text-[13px] tracking-[0.06em]">manimotion.</p>
        </Link>
      </div>

      <div className="shrink-0 space-y-0.5 border-b border-white/10 p-2">
        {nav.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200"
              )}
            >
              <Icon className="size-4 opacity-70" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pt-3">
        <p className="px-3 pb-2 text-[11px] font-medium text-neutral-600">
          Lectures
        </p>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-3">
          {threadIdsSorted.length === 0 ? (
            <p className="px-3 py-2 text-[12px] leading-relaxed text-neutral-600">
              No lectures yet. Start from New.
            </p>
          ) : (
            threadIdsSorted.map((threadId) => {
              const t = threadsById[threadId];
              if (!t) return null;
              const active = pathname === `/thread/${threadId}`;
              const rendering = t.videos.some(
                (v) => v.status === "queued" || v.status === "processing"
              );
              const hasVideo = t.videos.some((v) => v.status === "completed");
              return (
                <div
                  key={threadId}
                  className={cn("group relative", active && "bg-neutral-900")}
                >
                  <Link
                    href={`/thread/${threadId}`}
                    className={cn(
                      "block px-3 py-2 pr-8",
                      active
                        ? "text-white"
                        : "text-neutral-500 hover:text-neutral-200"
                    )}
                  >
                    <span className="line-clamp-2 text-[12px] font-medium leading-snug">
                      {t.title}
                    </span>
                    <span className="mt-1 block text-[11px] text-neutral-600">
                      {hasVideo
                        ? "Ready"
                        : rendering
                          ? "Rendering…"
                          : "Draft"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    title="Delete"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-neutral-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      setPendingDelete({
                        id: threadId,
                        title: t.title,
                        active,
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
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
            <div className="flex items-center gap-2.5 px-1">
              <div className="grid size-8 place-items-center border border-white/10 bg-neutral-950 text-[11px] font-semibold">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium">
                  {name || email}
                </p>
                <p className="truncate text-[11px] text-neutral-600">{email}</p>
              </div>
            </div>
            <button
              type="button"
              className="w-full px-2 py-1.5 text-left text-[12px] text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
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
            className="flex h-9 w-full items-center justify-center bg-white text-[13px] font-semibold text-black hover:bg-neutral-200"
          >
            Sign in
          </Link>
        )}
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lecture?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be removed
              {session?.user ? " from this account" : " from this browser"}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/15 text-red-400 hover:bg-red-500/25"
              onClick={() => {
                if (!pendingDelete) return;
                deleteThread(pendingDelete.id);
                if (pendingDelete.active) router.push("/");
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
