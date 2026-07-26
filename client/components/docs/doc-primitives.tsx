import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DocsToc } from "@/components/docs/docs-toc";

export function DocShell({
  children,
  toc = [],
}: {
  children: ReactNode;
  toc?: { id: string; label: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl gap-10 px-5 py-8 md:px-8 md:py-10">
      <div className="min-w-0 flex-1">{children}</div>
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
        "border bg-neutral-950 px-4 py-3 text-[13px] leading-relaxed text-neutral-400",
        tone === "default" && "border-white/10",
        tone === "accent" && "border-white/20",
        tone === "warn" && "border-amber-500/30 bg-amber-500/5 text-amber-100/80"
      )}
    >
      <p className="mb-1 text-[11px] font-semibold text-neutral-200">{title}</p>
      <div className="space-y-2 [&_code]:border [&_code]:border-white/10 [&_code]:bg-black [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-neutral-300">
        {children}
      </div>
    </aside>
  );
}

export function DocH1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[2rem] font-semibold tracking-tight text-white md:text-[2.25rem]">
      {children}
    </h1>
  );
}

export function DocLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-500">
      {children}
    </p>
  );
}

export function DocH2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-8 text-[1.15rem] font-semibold tracking-tight text-white"
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
        "mt-3 max-w-2xl text-[14px] leading-relaxed text-neutral-500",
        className
      )}
    >
      {children}
    </p>
  );
}

export function DocList({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 max-w-2xl list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-neutral-500 marker:text-neutral-600">
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
    <div className="mt-4 overflow-x-auto border border-white/10">
      <table className="w-full min-w-[480px] text-left text-[13px]">
        <thead className="border-b border-white/10 bg-neutral-950">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 font-medium text-neutral-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-neutral-400">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
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
