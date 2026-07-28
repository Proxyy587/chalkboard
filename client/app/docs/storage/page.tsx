import type { Metadata } from "next";
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
import { pageMetadata } from "@/lib/seo";
import { docsJsonLd } from "@/lib/docs-jsonld";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Storage",
  description:
    "Ship manimotion MP4s to your Cloudflare R2, AWS S3, or MinIO bucket — saved integration_id or inline credentials.",
  path: "/docs/storage",
  keywords: [
    "BYO storage",
    "R2 video upload",
    "S3 lecture video",
    "storage.integration_id",
    "storage.inline",
  ],
});

const TOC = [
  { id: "modes", label: "Modes" },
  { id: "saved", label: "Saved bucket" },
  { id: "inline", label: "Inline" },
  { id: "fields", label: "Fields" },
  { id: "security", label: "Security" },
];

export default function DocsStoragePage() {
  return (
    <DocShell toc={TOC} pageTitle="Storage">
      <JsonLd
        data={docsJsonLd({
          title: "Storage",
          description:
            "Upload finished videos to your R2 or S3 bucket via integration_id or inline.",
          path: "/docs/storage",
        })}
      />
      <p className="mm-label">API</p>
      <DocH1>Storage</DocH1>
      <DocLead>
        Finished MP4s upload to <em>your</em> bucket. Save credentials once in
        Settings (encrypted in the DB), or pass them per request.
      </DocLead>

      <DocH2 id="modes">Modes</DocH2>
      <DocTable
        headers={["Mode", "When"]}
        rows={[
          [
            "Saved bucket",
            <>
              Settings → Storage, then omit <code>storage</code> or pass{" "}
              <code>integration_id</code>
            </>,
          ],
          [
            "Inline",
            <>
              <code>storage.inline</code> on the request (job-scoped, not stored)
            </>,
          ],
          [
            "Master key",
            "Owner CLARITY_API_KEY only → platform .env R2",
          ],
        ]}
      />
      <div className="mt-4">
        <DocCallout title="Rule">
          <p>
            Use either <code>inline</code> or <code>integration_id</code> — not
            both. Public keys with no storage → 400.
          </p>
        </DocCallout>
      </div>

      <DocH2 id="saved">Saved bucket (recommended)</DocH2>
      <DocList>
        <li>
          Sign in →{" "}
          <Link
            href="/settings/storage"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Settings → Storage
          </Link>
        </li>
        <li>Add R2 / S3 / MinIO — we encrypt before insert; never return secrets</li>
        <li>Call the API with your chalk key (auto-uses latest bucket) or pass id</li>
      </DocList>
      <CodeTabs
        className="mt-4"
        examples={asTabs(STORAGE_INTEGRATION, {
          curl: "saved.sh",
          javascript: "saved.mjs",
          python: "saved.py",
        })}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="inline">Inline (scripts / CI)</DocH2>
      <CodeTabs
        className="mt-4"
        examples={asTabs(STORAGE_INLINE_R2, {
          curl: "inline-r2.sh",
          javascript: "inline-r2.mjs",
          python: "inline-r2.py",
        })}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="fields">Fields</DocH2>
      <DocTable
        headers={["Provider", "Required"]}
        rows={[
          [
            "r2",
            "bucket, access_key_id, secret_access_key, account_id (+ public_url)",
          ],
          [
            "s3 / minio / backblaze / custom_s3",
            "bucket, keys, region; endpoint for MinIO/custom; force_path_style for MinIO",
          ],
        ]}
      />
      <DocP>
        Always set <code>public_url</code> so <code>video_url</code> is
        browser-playable.
      </DocP>

      <DocH2 id="security">Security</DocH2>
      <DocList>
        <li>DB credentials: AES-256-GCM + scrypt (Vercel encrypts, VPS decrypts)</li>
        <li>
          <code>SECRET_ENCRYPTION_KEY</code> must match on both sides (≥32 chars)
        </li>
        <li>List APIs return metadata only — never ciphertext or plaintext secrets</li>
        <li>Inline creds are not persisted</li>
      </DocList>
      <DocP>
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
