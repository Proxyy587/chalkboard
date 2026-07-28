"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/**
 * Copies the visible docs article as plain text so users can paste into an AI.
 */
export function CopyDocsForAi({ pageTitle }: { pageTitle?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const root = document.querySelector<HTMLElement>("[data-doc-content]");
    const body = root?.innerText?.trim() ?? "";
    if (!body) return;
    const header = pageTitle
      ? `# manimotion docs — ${pageTitle}\nSource: ${window.location.href}\n\n`
      : `# manimotion docs\nSource: ${window.location.href}\n\n`;
    await navigator.clipboard.writeText(header + body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="mm-ghost-btn inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px]"
      title="Copy this page as plain text for an AI assistant"
    >
      {copied ? (
        <>
          <Check className="size-3.5" strokeWidth={1.75} />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" strokeWidth={1.75} />
          Copy for AI
        </>
      )}
    </button>
  );
}
