import Link from "next/link";

import { CodeTabs } from "@/components/docs/code-tabs";
import {
  DocCallout,
  DocH1,
  DocH2,
  DocLead,
  DocList,
  DocP,
  DocShell,
  DocTable,
} from "@/components/docs/doc-primitives";
import {
  CREATE_JOB_RESPONSE,
  STORAGE_INLINE_R2,
  STORAGE_INTEGRATION,
  asTabs,
} from "@/lib/docs-examples";

const TOC = [
  { id: "why", label: "Why storage?" },
  { id: "modes", label: "Three modes" },
  { id: "saved", label: "Saved integration" },
  { id: "inline", label: "Inline credentials" },
  { id: "fields", label: "Field reference" },
  { id: "security", label: "Security" },
];

export default function DocsStoragePage() {
  return (
    <DocShell toc={TOC}>
      <p className="mm-label">API</p>
      <DocH1>Storage</DocH1>
      <DocLead>
        By default, finished MP4s go to manimotion’s configured bucket. If you
        want videos in <em>your</em> R2 / S3 / MinIO / Backblaze, pass{" "}
        <code>storage</code> on the request — or save an integration in Settings.
      </DocLead>

      <DocH2 id="why">Why care?</DocH2>
      <DocList>
        <li>Keep lecture files under your CDN / domain</li>
        <li>Control retention and permissions</li>
        <li>Avoid relying on a shared default bucket forever</li>
      </DocList>

      <DocH2 id="modes">Three modes (priority order)</DocH2>
      <DocTable
        headers={["Mode", "How"]}
        rows={[
          [
            "1. Inline",
            <code key="i">storage.inline</code>,
          ],
          [
            "2. Saved id",
            <code key="s">storage.integration_id</code>,
          ],
          [
            "3. Default",
            "Omit storage → worker default bucket",
          ],
        ]}
      />
      <div className="mt-4">
        <DocCallout title="Rule" tone="accent">
          <p>
            Use <strong className="text-[var(--ink-soft)]">either</strong>{" "}
            <code>inline</code> <strong className="text-[var(--ink-soft)]">or</strong>{" "}
            <code>integration_id</code> — never both in one request.
          </p>
        </DocCallout>
      </div>

      <DocH2 id="saved">Saved integration (easiest)</DocH2>
      <DocP>
        1. Sign in →{" "}
        <Link
          href="/settings/storage"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Settings → Storage
        </Link>
        .<br />
        2. Add R2 / S3 / etc. We encrypt credentials at rest.
        <br />
        3. Copy the integration id and pass it on create:
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(STORAGE_INTEGRATION, {
          curl: "with-integration.sh",
          javascript: "with-integration.mjs",
          python: "with-integration.py",
        })}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="inline">Inline credentials (per request)</DocH2>
      <DocP>
        Creds live only for that job. Nothing is saved to our DB. Good for
        one-off scripts.
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(STORAGE_INLINE_R2, {
          curl: "inline-r2.sh",
          javascript: "inline-r2.mjs",
          python: "inline-r2.py",
        })}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="fields">Field reference</DocH2>
      <p className="mt-3 text-[12px] font-medium tracking-[0.08em] text-[var(--muted-text)]">
        INLINE R2
      </p>
      <DocTable
        headers={["Field", "Required"]}
        rows={[
          [<code key="p">provider</code>, '"r2"'],
          [<code key="b">bucket</code>, "yes"],
          [<code key="a">access_key_id</code>, "yes"],
          [<code key="s">secret_access_key</code>, "yes"],
          [<code key="c">account_id</code>, "yes (Cloudflare)"],
          [<code key="u">public_url</code>, "optional CDN base"],
        ]}
      />
      <p className="mt-6 text-[12px] font-medium tracking-[0.08em] text-[var(--muted-text)]">
        INLINE S3 / MINIO / BACKBLAZE
      </p>
      <DocTable
        headers={["Field", "Notes"]}
        rows={[
          [
            <code key="p">provider</code>,
            '"s3" | "custom_s3" | "minio" | "backblaze"',
          ],
          [<code key="b">bucket</code>, "required"],
          [<code key="a">access_key_id / secret_access_key</code>, "required"],
          [<code key="r">region</code>, "default us-east-1"],
          [<code key="e">endpoint</code>, "required for MinIO / custom"],
          [<code key="f">force_path_style</code>, "usually true for MinIO"],
          [<code key="u">public_url</code>, "optional"],
        ]}
      />
      <CodeTabs
        className="mt-4"
        examples={asTabs(
          {
            curl: `curl -sS -X POST "$MANIMOTION_API/video/request" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $MANIMOTION_KEY" \\
  -d '{
    "prompt": "Timeline of the industrial revolution",
    "engine": "remotion",
    "storage": {
      "inline": {
        "provider": "minio",
        "bucket": "lectures",
        "access_key_id": "minio",
        "secret_access_key": "minio123",
        "region": "us-east-1",
        "endpoint": "https://minio.example.com",
        "force_path_style": true
      }
    }
  }'`,
            javascript: `await fetch(\`\${process.env.MANIMOTION_API}/video/request\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.MANIMOTION_KEY,
  },
  body: JSON.stringify({
    prompt: "Timeline of the industrial revolution",
    engine: "remotion",
    storage: {
      inline: {
        provider: "minio",
        bucket: "lectures",
        access_key_id: process.env.MINIO_KEY,
        secret_access_key: process.env.MINIO_SECRET,
        region: "us-east-1",
        endpoint: "https://minio.example.com",
        force_path_style: true,
      },
    },
  }),
});`,
            python: `requests.post(
    f"{API}/video/request",
    headers={"Content-Type": "application/json", "x-api-key": KEY},
    json={
        "prompt": "Timeline of the industrial revolution",
        "engine": "remotion",
        "storage": {
            "inline": {
                "provider": "minio",
                "bucket": "lectures",
                "access_key_id": "...",
                "secret_access_key": "...",
                "region": "us-east-1",
                "endpoint": "https://minio.example.com",
                "force_path_style": True,
            }
        },
    },
)`,
          },
          {
            curl: "inline-minio.sh",
            javascript: "inline-minio.mjs",
            python: "inline-minio.py",
          }
        )}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="security">Security</DocH2>
      <DocList>
        <li>Saved integrations are encrypted (AES-GCM) before storage</li>
        <li>Inline creds are job-scoped — not written to Settings</li>
        <li>Still: treat keys like passwords. Rotate if leaked.</li>
      </DocList>
      <DocP>
        Back to{" "}
        <Link
          href="/docs/api"
          className="text-foreground underline-offset-2 hover:underline"
        >
          API reference
        </Link>
        .
      </DocP>
    </DocShell>
  );
}
