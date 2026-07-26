import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock } from "@/components/docs/code-block";
import { CodeTabs } from "@/components/docs/code-tabs";
import {
  DocCallout,
  DocH1,
  DocH2,
  DocLead,
  DocList,
  DocP,
  DocShell,
} from "@/components/docs/doc-primitives";
import {
  CREATE_JOB_RESPONSE,
  FULL_FLOW,
  POLL_COMPLETED_RESPONSE,
  POLL_STATUS,
  STORAGE_INLINE_R2,
  asTabs,
} from "@/lib/docs-examples";
import { pageMetadata } from "@/lib/seo";
import { docsJsonLd } from "@/lib/docs-jsonld";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Quickstart",
  description:
    "Create your first manimotion video in minutes — API key, storage, POST /video/request, poll until you get an MP4 URL.",
  path: "/docs/quickstart",
  keywords: [
    "manimotion quickstart",
    "video API tutorial",
    "generate video API example",
  ],
});

const TOC = [
  { id: "setup", label: "1. Setup" },
  { id: "create", label: "2. Create" },
  { id: "poll", label: "3. Poll" },
  { id: "loop", label: "4. Loop" },
];

export default function DocsQuickstartPage() {
  return (
    <DocShell toc={TOC}>
      <JsonLd
        data={docsJsonLd({
          title: "Quickstart",
          description:
            "Create your first manimotion video in minutes via the API.",
          path: "/docs/quickstart",
        })}
      />
      <p className="mm-label">Get started</p>
      <DocH1>Quickstart</DocH1>
      <DocLead>
        Key → storage → create job → poll → MP4 URL.
      </DocLead>

      <DocH2 id="setup">1. Setup</DocH2>
      <DocList>
        <li>
          Create a{" "}
          <Link
            href="/settings/api-keys"
            className="text-foreground underline-offset-2 hover:underline"
          >
            API key
          </Link>
        </li>
        <li>
          Save a bucket in{" "}
          <Link
            href="/settings/storage"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Settings → Storage
          </Link>{" "}
          <em>or</em> keep R2 env vars for <code>storage.inline</code>
        </li>
      </DocList>
      <CodeBlock
        className="mt-4"
        title=".env"
        lang="bash"
        code={`MANIMOTION_API=https://api.manimotion.dev
MANIMOTION_KEY=chalk_live_sk_v1_...`}
      />
      <div className="mt-4">
        <DocCallout title="Server-side only" tone="warn">
          <p>Never ship the API key or bucket secrets in a public frontend.</p>
        </DocCallout>
      </div>

      <DocH2 id="create">2. Create</DocH2>
      <DocP>
        If you saved storage in Settings, omit <code>storage</code>. Otherwise
        pass <code>storage.inline</code>:
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(STORAGE_INLINE_R2, {
          curl: "create.sh",
          javascript: "create.mjs",
          python: "create.py",
        })}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="poll">3. Poll</DocH2>
      <CodeTabs
        className="mt-4"
        examples={asTabs(POLL_STATUS, {
          curl: "poll.sh",
          javascript: "poll.mjs",
          python: "poll.py",
        })}
        response={POLL_COMPLETED_RESPONSE}
      />

      <DocH2 id="loop">4. Full loop</DocH2>
      <CodeTabs
        className="mt-4"
        examples={asTabs(FULL_FLOW, {
          curl: "loop.sh",
          javascript: "generate.mjs",
          python: "generate.py",
        })}
        response={`https://cdn.example.com/videos/….mp4`}
        responseTitle="stdout"
      />
      <DocP>
        More:{" "}
        <Link
          href="/docs/storage"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Storage
        </Link>{" "}
        ·{" "}
        <Link
          href="/docs/api"
          className="text-foreground underline-offset-2 hover:underline"
        >
          API
        </Link>
        .
      </DocP>
    </DocShell>
  );
}
