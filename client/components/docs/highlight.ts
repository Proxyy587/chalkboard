import { createHighlighter, type Highlighter } from "shiki";

const THEME = "github-dark-default";

const LANGS = [
  "bash",
  "shellscript",
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "python",
  "json",
  "html",
  "css",
  "yaml",
  "toml",
  "markdown",
  "http",
  "diff",
  "ini",
] as const;

const LANG_ALIASES: Record<string, string> = {
  curl: "bash",
  shell: "shellscript",
  sh: "bash",
  zsh: "bash",
  console: "bash",
  env: "ini",
  dotenv: "ini",
  js: "javascript",
  ts: "typescript",
  py: "python",
  yml: "yaml",
  md: "markdown",
  plaintext: "bash",
  text: "bash",
};

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

function resolveLang(lang: string): string {
  const key = lang.trim().toLowerCase();
  return LANG_ALIASES[key] ?? key;
}

const PRE_CLASS =
  "overflow-x-auto p-4 m-0 text-[12.5px] leading-relaxed bg-transparent";

/**
 * Syntax-highlight source with Shiki (token colors preserved).
 * Shared highlighter instance for fast multi-block docs pages.
 */
export async function highlightCode(
  code: string,
  lang: string
): Promise<string> {
  const source = code.trimEnd();
  const resolved = resolveLang(lang);

  try {
    const highlighter = await getHighlighter();
    const loaded = highlighter.getLoadedLanguages();
    const useLang = loaded.includes(resolved as never) ? resolved : "bash";

    let html = highlighter.codeToHtml(source, {
      lang: useLang,
      theme: THEME,
    });

    // Merge layout classes; drop pre background so our chrome shows through
    html = html.replace(/<pre\b([^>]*)>/i, (_m, attrs: string) => {
      let nextAttrs = attrs;
      let style = "";

      const styleMatch = attrs.match(/\sstyle="([^"]*)"/i);
      if (styleMatch) {
        style = styleMatch[1]
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s && !/^background(-color)?\s*:/i.test(s))
          .join("; ");
        nextAttrs = nextAttrs.replace(/\sstyle="[^"]*"/i, "");
      }

      const classMatch = attrs.match(/\sclass="([^"]*)"/i);
      if (classMatch) {
        nextAttrs = nextAttrs.replace(
          /\sclass="[^"]*"/i,
          ` class="${classMatch[1]} ${PRE_CLASS}"`
        );
      } else {
        nextAttrs = ` class="${PRE_CLASS}"${nextAttrs}`;
      }

      if (style) nextAttrs += ` style="${style}"`;
      return `<pre${nextAttrs}>`;
    });

    return html;
  } catch {
    return `<pre class="${PRE_CLASS}"><code>${escapeHtml(source)}</code></pre>`;
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
