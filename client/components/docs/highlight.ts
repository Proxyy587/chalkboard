import { codeToHtml } from "shiki";

export async function highlightCode(code: string, lang: string): Promise<string> {
  const source = code.trimEnd();
  try {
    let html = await codeToHtml(source, {
      lang,
      theme: "github-dark-default",
    });
    return html
      .replace(/style="[^"]*"/g, "")
      .replace(
        "<pre ",
        '<pre class="overflow-x-auto p-4 m-0 text-[12.5px] leading-relaxed bg-transparent" '
      );
  } catch {
    return `<pre class="overflow-x-auto p-4 m-0 text-[12.5px] leading-relaxed"><code>${escapeHtml(
      source
    )}</code></pre>`;
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
