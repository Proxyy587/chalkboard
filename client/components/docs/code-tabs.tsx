import { highlightCode } from "@/components/docs/highlight";
import {
  CodeTabsClient,
  type CodeLang,
  type CodeVariant,
} from "@/components/docs/code-tabs-client";

const LANG_META: Record<CodeLang, { label: string; shiki: string }> = {
  curl: { label: "cURL", shiki: "bash" },
  javascript: { label: "JavaScript", shiki: "javascript" },
  python: { label: "Python", shiki: "python" },
};

export type ExampleSnippet = {
  lang: CodeLang;
  code: string;
  title?: string;
};

export async function CodeTabs({
  examples,
  response,
  responseTitle = "response.json",
  className,
  defaultLang = "curl",
}: {
  examples: ExampleSnippet[];
  response?: string;
  responseTitle?: string;
  className?: string;
  defaultLang?: CodeLang;
}) {
  const variants: CodeVariant[] = await Promise.all(
    examples.map(async (ex) => {
      const meta = LANG_META[ex.lang];
      return {
        lang: ex.lang,
        label: meta.label,
        title: ex.title,
        code: ex.code.trimEnd(),
        html: await highlightCode(ex.code, meta.shiki),
      };
    })
  );

  const responseBlock = response
    ? {
        title: responseTitle,
        code: response.trimEnd(),
        html: await highlightCode(response, "json"),
      }
    : undefined;

  return (
    <CodeTabsClient
      variants={variants}
      response={responseBlock}
      className={className}
      defaultLang={defaultLang}
    />
  );
}
