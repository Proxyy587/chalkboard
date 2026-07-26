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
        "overflow-hidden border border-white/10 bg-[#0d1117]",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-3 py-2">
        <span className="font-mono text-[11px] text-neutral-500">{title}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white"
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
        className="shiki-block [&_pre]:m-0 [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
