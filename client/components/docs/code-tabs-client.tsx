"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type CodeLang = "curl" | "javascript" | "python";

export type CodeVariant = {
  lang: CodeLang;
  label: string;
  title?: string;
  code: string;
  html: string;
};

export function CodeTabsClient({
  variants,
  response,
  className,
  defaultLang = "curl",
}: {
  variants: CodeVariant[];
  response?: { title?: string; code: string; html: string };
  className?: string;
  defaultLang?: CodeLang;
}) {
  const initial =
    variants.find((v) => v.lang === defaultLang)?.lang ?? variants[0]?.lang ?? "curl";
  const [lang, setLang] = useState<CodeLang>(initial);
  const [copied, setCopied] = useState(false);
  const active = variants.find((v) => v.lang === lang) ?? variants[0];

  async function copy() {
    if (!active) return;
    await navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!active) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden border border-white/10 bg-[#0d1117]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            {variants.map((v) => (
              <button
                key={v.lang}
                type="button"
                onClick={() => setLang(v.lang)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] transition-colors",
                  lang === v.lang
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-neutral-200"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="font-mono text-[11px] text-neutral-600">
              {active.title ?? active.label}
            </span>
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
        </div>
        <div
          className="shiki-block [&_pre]:m-0 [&_code]:font-mono"
          dangerouslySetInnerHTML={{ __html: active.html }}
        />
      </div>

      {response && (
        <div className="overflow-hidden border border-white/10 bg-[#0d1117]">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-3 py-2">
            <span className="text-[11px] font-medium tracking-[0.08em] text-neutral-500">
              RESPONSE
            </span>
            <span className="font-mono text-[11px] text-neutral-600">
              {response.title ?? "response.json"}
            </span>
          </div>
          <div
            className="shiki-block [&_pre]:m-0 [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: response.html }}
          />
        </div>
      )}
    </div>
  );
}
