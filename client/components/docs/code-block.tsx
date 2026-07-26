import { highlightCode } from "@/components/docs/highlight";
import { CodeBlockClient } from "@/components/docs/code-block-client";

export async function CodeBlock({
  code,
  lang = "bash",
  title,
  className,
}: {
  code: string;
  lang?: string;
  title?: string;
  className?: string;
}) {
  const source = code.trimEnd();
  const html = await highlightCode(source, lang);

  return (
    <CodeBlockClient
      code={source}
      title={title ?? lang}
      html={html}
      className={className}
    />
  );
}
