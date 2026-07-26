"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function CodeBlockClient({
  code,
  title,
  html,
  className,
}: {
  code: string;
  title: string;
  html: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-[var(--chip-line)] bg-[#0d0d0c]",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="font-mono text-[11px] text-white/45">{title}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 text-[11px] text-white/45 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      </div>
      <div
        className="shiki-block text-[#e6e6e0] [&_pre]:m-0 [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
