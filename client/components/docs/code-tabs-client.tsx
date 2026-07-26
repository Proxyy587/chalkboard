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
      <div className="overflow-hidden rounded-[10px] border border-[var(--chip-line)] bg-[#0d0d0c]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            {variants.map((v) => (
              <button
                key={v.lang}
                type="button"
                onClick={() => setLang(v.lang)}
                className={cn(
                  "rounded-[7px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                  lang === v.lang
                    ? "bg-white text-black"
                    : "text-white/45 hover:text-white/80"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="font-mono text-[11px] text-white/35">
              {active.title ?? active.label}
            </span>
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
        </div>
        <div
          className="shiki-block text-[#e6e6e0] [&_pre]:m-0 [&_code]:font-mono"
          dangerouslySetInnerHTML={{ __html: active.html }}
        />
      </div>

      {response && (
        <div className="overflow-hidden rounded-[10px] border border-[var(--chip-line)] bg-[#0d0d0c]">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-[11px] font-medium tracking-[0.06em] text-white/45">
              RESPONSE
            </span>
            <span className="font-mono text-[11px] text-white/35">
              {response.title ?? "response.json"}
            </span>
          </div>
          <div
            className="shiki-block text-[#e6e6e0] [&_pre]:m-0 [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: response.html }}
          />
        </div>
      )}
    </div>
  );
}
