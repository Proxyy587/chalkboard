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
  CREATE_JOB,
  CREATE_JOB_RESPONSE,
  POLL_COMPLETED_RESPONSE,
  POLL_FAILED_RESPONSE,
  POLL_STATUS,
  asTabs,
} from "@/lib/docs-examples";

const TOC = [
  { id: "auth", label: "Auth header" },
  { id: "create", label: "POST /video/request" },
  { id: "status", label: "GET /video/status" },
  { id: "statuses", label: "Status values" },
  { id: "errors", label: "HTTP errors" },
  { id: "tips", label: "Prompt tips" },
];

export default function DocsApiPage() {
  return (
    <DocShell toc={TOC}>
      <p className="mm-label">API</p>
      <DocH1>Reference</DocH1>
      <DocLead>
        The full public API. Two endpoints. Examples in cURL, JavaScript, and
        Python — flip the tabs. Response JSON sits under every request example.
      </DocLead>

      <DocH2 id="auth">Auth header</DocH2>
      <DocP>
        Every call needs <code>x-api-key</code>. Create keys in{" "}
        <Link
          href="/settings/api-keys"
          className="text-white underline-offset-2 hover:underline"
        >
          Settings → API keys
        </Link>
        .
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(
          {
            curl: `# set once in your shell / CI secrets
export MANIMOTION_API=https://YOUR_API_HOST
export MANIMOTION_KEY=chalk_live_sk_v1_...

# then pass on every request
curl -sS "$MANIMOTION_API/health" -H "x-api-key: $MANIMOTION_KEY"`,
            javascript: `const headers = {
  "Content-Type": "application/json",
  "x-api-key": process.env.MANIMOTION_KEY, // chalk_live_sk_v1_...
};`,
            python: `import os

headers = {
    "Content-Type": "application/json",
    "x-api-key": os.environ["MANIMOTION_KEY"],  # chalk_live_sk_v1_...
}`,
          },
          {
            curl: "auth.sh",
            javascript: "headers.js",
            python: "headers.py",
          }
        )}
        response={`{
  "status": "ok",
  "service": "clarity-video"
}`}
        responseTitle="GET /health (optional ping)"
      />

      <DocH2 id="create">POST /video/request</DocH2>
      <DocP>Starts a job. Returns immediately.</DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(CREATE_JOB, {
          curl: "request.sh",
          javascript: "request.mjs",
          python: "request.py",
        })}
        response={CREATE_JOB_RESPONSE}
      />
      <DocTable
        headers={["Field", "Required", "Notes"]}
        rows={[
          [
            <code key="p">prompt</code>,
            "yes",
            "STEM topic / lecture request. Min ~3 chars.",
          ],
          [
            <code key="e">engine</code>,
            "no",
            <>
              <code>auto</code> (default) | <code>manim</code> |{" "}
              <code>remotion</code>
            </>,
          ],
          [
            <code key="m">model</code>,
            "no",
            "LLM id. Default deepseek/deepseek-v3.2",
          ],
          [
            <code key="d">duration</code>,
            "no",
            "Target seconds 15–180. Omit for auto (~20–120).",
          ],
          [
            <code key="s">storage</code>,
            "no",
            <>
              Optional upload target — see{" "}
              <Link
                href="/docs/storage"
                className="text-white underline-offset-2 hover:underline"
              >
                Storage
              </Link>
            </>,
          ],
        ]}
      />

      <DocH2 id="status">GET /video/status/{"{job_id}"}</DocH2>
      <DocP>Poll until the job finishes.</DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(POLL_STATUS, {
          curl: "status.sh",
          javascript: "status.mjs",
          python: "status.py",
        })}
        response={POLL_COMPLETED_RESPONSE}
        responseTitle="completed.json"
      />
      <p className="mt-4 text-[12px] font-medium tracking-[0.08em] text-neutral-500">
        FAILED SHAPE
      </p>
      <CodeTabs
        className="mt-2"
        examples={asTabs(POLL_STATUS)}
        response={POLL_FAILED_RESPONSE}
        responseTitle="failed.json"
      />

      <DocH2 id="statuses">Status values</DocH2>
      <DocTable
        headers={["status", "Meaning", "What you do"]}
        rows={[
          [
            <code key="q">queued</code>,
            "Accepted, waiting",
            "Keep polling",
          ],
          [
            <code key="p">processing</code>,
            "Planning / TTS / render",
            "Keep polling (2–3s)",
          ],
          [
            <code key="c">completed</code>,
            "MP4 ready",
            "Use video_url",
          ],
          [
            <code key="f">failed</code>,
            "Generation crashed",
            "Read error, fix prompt, retry",
          ],
        ]}
      />

      <DocH2 id="errors">HTTP errors</DocH2>
      <DocTable
        headers={["Code", "When"]}
        rows={[
          ["401", "Missing / invalid x-api-key"],
          ["400", "Bad body (empty prompt, bad duration, bad storage)"],
          ["404", "Unknown job_id"],
          ["429", "Rate limited — slow down"],
        ]}
      />
      <div className="mt-4">
        <DocCallout title="200 + failed" tone="warn">
          <p>
            A normal HTTP 200 can still mean the job failed. Always check{" "}
            <code>status</code> in the JSON body.
          </p>
        </DocCallout>
      </div>

      <DocH2 id="tips">Prompt tips</DocH2>
      <DocList>
        <li>One clear topic beats “explain all of physics”.</li>
        <li>Name the audience (“first-year CS”, “AP Calc”).</li>
        <li>Ask for the visual: graph, derivation steps, timeline…</li>
        <li>
          Prefer omitting <code>duration</code> unless you need a hard length.
        </li>
      </DocList>
      <DocP>
        Engines details →{" "}
        <Link
          href="/docs/engines"
          className="text-white underline-offset-2 hover:underline"
        >
          Engines
        </Link>
        . BYO bucket →{" "}
        <Link
          href="/docs/storage"
          className="text-white underline-offset-2 hover:underline"
        >
          Storage
        </Link>
        .
      </DocP>
    </DocShell>
  );
}
