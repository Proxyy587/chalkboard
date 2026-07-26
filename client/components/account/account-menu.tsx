"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { History, LogOut, Settings, Trash2 } from "lucide-react";

import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function AccountMenu({
  className,
  align = "end",
}: {
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { threadIdsSorted, threadsById, deleteThread } = useChalkboard();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    active: boolean;
  } | null>(null);

  const email = session?.user?.email;
  const name = session?.user?.name;
  const initial = (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
  const recent = threadIdsSorted.slice(0, 8);

  if (!email) {
    return (
      <Link
        href="/sign-in"
        className={cn(
          "inline-flex h-8 items-center rounded-[8px] border border-[var(--chip-line)] bg-[var(--surface)] px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-[var(--btn-hover-bg)] hover:border-[var(--btn-hover-border)]",
          className
        )}
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-[8px] border border-[var(--chip-line)] bg-[var(--surface)] p-1 pr-2.5 text-left transition-colors hover:bg-[var(--btn-hover-bg)] hover:border-[var(--btn-hover-border)]",
              className
            )}
            aria-label="Account and lecture history"
          >
            <Avatar className="size-6 border border-[var(--chip-line)] bg-[var(--chip)] text-[10px] font-semibold">
              <AvatarImage src={session?.user?.image ?? ""} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[100px] truncate text-[12px] font-medium sm:inline">
              {name?.split(" ")[0] || "Account"}
            </span>
            <History className="size-3.5 text-[var(--muted-2)]" strokeWidth={1.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className="w-[300px] gap-0 overflow-hidden p-0"
          sideOffset={8}
        >
          <div className="border-b border-border px-3.5 py-3">
            <p className="truncate text-[13px] font-medium">{name || email}</p>
            <p className="truncate text-[11px] text-[var(--muted-2)]">{email}</p>
          </div>

          <div className="max-h-[240px] overflow-y-auto py-2">
            <p className="px-3.5 pb-1.5 text-[11px] font-medium text-[var(--muted-2)]">
              Recent lectures
            </p>
            {recent.length === 0 ? (
              <p className="px-3.5 py-3 text-[12px] leading-relaxed text-[var(--muted-2)]">
                No lectures yet. Generate one from the home demo.
              </p>
            ) : (
              recent.map((threadId) => {
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
                    className={cn(
                      "group relative mx-1.5 rounded-[8px]",
                      active && "bg-[var(--chip)]"
                    )}
                  >
                    <Link
                      href={`/thread/${threadId}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-2.5 py-2 pr-8",
                        active
                          ? "text-foreground"
                          : "text-[var(--muted-text)] hover:text-foreground"
                      )}
                    >
                      <span className="line-clamp-1 text-[12px] font-medium">
                        {t.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--muted-2)]">
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
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[6px] p-1 text-[var(--muted-2)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
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
          </div>

          <div className="space-y-0.5 border-t border-border p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12px] text-[var(--ink-soft)] hover:bg-[var(--chip)] hover:text-foreground"
            >
              <Settings className="size-3.5 opacity-70" strokeWidth={1.5} />
              Settings
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12px] text-[var(--ink-soft)] hover:bg-[var(--chip)] hover:text-foreground"
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.push("/sign-in");
                router.refresh();
              }}
            >
              <LogOut className="size-3.5 opacity-70" strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lecture?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be removed from this account. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/15 text-red-500 hover:bg-red-500/25"
              onClick={() => {
                if (!pendingDelete) return;
                deleteThread(pendingDelete.id);
                if (pendingDelete.active) router.push("/");
                setPendingDelete(null);
                setOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Guest-friendly history popover (no account required). */
export function HistoryMenu({
  className,
  align = "end",
}: {
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { threadIdsSorted, threadsById, deleteThread } = useChalkboard();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    active: boolean;
  } | null>(null);

  const recent = threadIdsSorted.slice(0, 10);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn("mm-icon-btn", className)}
            aria-label="Lecture history"
            title="History"
          >
            <History className="size-4" strokeWidth={1.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className="w-[300px] gap-0 overflow-hidden p-0"
          sideOffset={8}
        >
          <div className="border-b border-border px-3.5 py-3">
            <p className="text-[13px] font-medium">Lecture history</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
              {session?.user
                ? "Synced to your account"
                : "Saved in this browser"}
            </p>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-2">
            {recent.length === 0 ? (
              <p className="px-3.5 py-3 text-[12px] leading-relaxed text-[var(--muted-2)]">
                No lectures yet.
              </p>
            ) : (
              recent.map((threadId) => {
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
                    className={cn(
                      "group relative mx-1.5 rounded-[8px]",
                      active && "bg-[var(--chip)]"
                    )}
                  >
                    <Link
                      href={`/thread/${threadId}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-2.5 py-2 pr-8",
                        active
                          ? "text-foreground"
                          : "text-[var(--muted-text)] hover:text-foreground"
                      )}
                    >
                      <span className="line-clamp-1 text-[12px] font-medium">
                        {t.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--muted-2)]">
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
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[6px] p-1 text-[var(--muted-2)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
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
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
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
              className="bg-red-500/15 text-red-500 hover:bg-red-500/25"
              onClick={() => {
                if (!pendingDelete) return;
                deleteThread(pendingDelete.id);
                if (pendingDelete.active) router.push("/");
                setPendingDelete(null);
                setOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
