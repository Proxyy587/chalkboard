import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DocsToc } from "@/components/docs/docs-toc";
import { CopyDocsForAi } from "@/components/docs/copy-docs-for-ai";

export function DocShell({
  children,
  toc = [],
  pageTitle,
}: {
  children: ReactNode;
  toc?: { id: string; label: string }[];
  /** Used by “Copy for AI” clipboard header */
  pageTitle?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl gap-10 px-5 py-8 md:px-8 md:py-10">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex justify-end">
          <CopyDocsForAi pageTitle={pageTitle} />
        </div>
        <div data-doc-content>{children}</div>
      </div>
      <aside className="hidden w-[180px] shrink-0 lg:block">
        <DocsToc items={toc} />
      </aside>
    </div>
  );
}

export function DocCallout({
  title = "Note",
  children,
  tone = "default",
}: {
  title?: string;
  children: ReactNode;
  tone?: "default" | "accent" | "warn";
}) {
  return (
    <aside
      className={cn(
        "rounded-[10px] border px-4 py-3 text-[13px] leading-relaxed text-[var(--ink-soft)]",
        tone === "default" && "border-[var(--chip-line)] bg-[var(--chip)]",
        tone === "accent" && "border-[var(--btn-hover-border)] bg-[var(--surface)]",
        tone === "warn" &&
          "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-100/80"
      )}
    >
      <p className="mb-1 text-[11px] font-semibold text-foreground">{title}</p>
      <div className="space-y-2 [&_code]:rounded-[5px] [&_code]:border [&_code]:border-[var(--chip-line)] [&_code]:bg-[var(--surface)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-[var(--ink-soft)]">
        {children}
      </div>
    </aside>
  );
}

export function DocH1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[2rem] font-bold tracking-[-0.02em] text-foreground md:text-[2.25rem]">
      {children}
    </h1>
  );
}

export function DocLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted-text)]">
      {children}
    </p>
  );
}

export function DocH2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-8 text-[1.15rem] font-bold tracking-[-0.01em] text-foreground"
    >
      {children}
    </h2>
  );
}

export function DocP({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--ink-soft)]",
        className
      )}
    >
      {children}
    </p>
  );
}

export function DocList({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 max-w-2xl list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-[var(--ink-soft)] marker:text-[var(--muted-2)]">
      {children}
    </ul>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[10px] border border-[var(--chip-line)]">
      <table className="w-full min-w-[480px] text-left text-[13px]">
        <thead className="border-b border-border bg-[var(--chip)]">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 font-medium text-[var(--ink-soft)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-[var(--ink-soft)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--chip)]">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
