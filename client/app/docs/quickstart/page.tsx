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
  asTabs,
} from "@/lib/docs-examples";

const TOC = [
  { id: "setup", label: "1. Setup" },
  { id: "create", label: "2. Create a job" },
  { id: "poll", label: "3. Poll status" },
  { id: "loop", label: "4. Full loop" },
  { id: "checklist", label: "Checklist" },
];

export default function DocsQuickstartPage() {
  return (
    <DocShell toc={TOC}>
      <p className="mm-label">Get started</p>
      <DocH1>Quickstart</DocH1>
      <DocLead>
        Four steps. Get a key, create a job, poll until done, download the MP4.
        Use the language tabs — cURL, JavaScript, or Python.
      </DocLead>

      <DocH2 id="setup">1. Setup</DocH2>
      <DocList>
        <li>
          Create a key in{" "}
          <Link
            href="/settings/api-keys"
            className="text-white underline-offset-2 hover:underline"
          >
            Settings → API keys
          </Link>{" "}
          (copy it once)
        </li>
        <li>Put the API host + key in env vars on your machine / server</li>
      </DocList>
      <CodeBlock
        className="mt-4"
        title=".env"
        lang="bash"
        code={`MANIMOTION_API=https://YOUR_API_HOST
MANIMOTION_KEY=chalk_live_sk_v1_...`}
      />
      <div className="mt-4">
        <DocCallout title="Keep the key server-side" tone="warn">
          <p>
            Never put <code>MANIMOTION_KEY</code> in a public frontend bundle.
            Call the API from a backend, script, or serverless function.
          </p>
        </DocCallout>
      </div>

      <DocH2 id="create">2. Create a job</DocH2>
      <DocP>
        <code>POST /video/request</code> with JSON. You get a{" "}
        <code>job_id</code> back immediately.
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(
          {
            curl: `curl -sS -X POST "$MANIMOTION_API/video/request" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $MANIMOTION_KEY" \\
  -d '{
    "prompt": "Explain the product rule with a visual derivation",
    "engine": "manim"
  }'`,
            javascript: `const create = await fetch(\`\${process.env.MANIMOTION_API}/video/request\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.MANIMOTION_KEY,
  },
  body: JSON.stringify({
    prompt: "Explain the product rule with a visual derivation",
    engine: "manim",
  }),
}).then((r) => r.json());

console.log(create.job_id); // save this`,
            python: `import os, requests

create = requests.post(
    f"{os.environ['MANIMOTION_API']}/video/request",
    headers={
        "Content-Type": "application/json",
        "x-api-key": os.environ["MANIMOTION_KEY"],
    },
    json={
        "prompt": "Explain the product rule with a visual derivation",
        "engine": "manim",
    },
).json()
print(create["job_id"])  # save this`,
          },
          {
            curl: "create.sh",
            javascript: "create.mjs",
            python: "create.py",
          }
        )}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="poll">3. Poll status</DocH2>
      <DocP>
        Hit <code>GET /video/status/{"{job_id}"}</code> every 2–3 seconds until
        status is <code>completed</code> or <code>failed</code>.
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(POLL_STATUS, {
          curl: "poll.sh",
          javascript: "poll.mjs",
          python: "poll.py",
        })}
        response={POLL_COMPLETED_RESPONSE}
        responseTitle="completed.json"
      />

      <DocH2 id="loop">4. Full loop (copy-paste)</DocH2>
      <DocP>
        One script that creates the job and waits for the URL.
      </DocP>
      <CodeTabs
        className="mt-4"
        examples={asTabs(FULL_FLOW, {
          curl: "loop.sh",
          javascript: "generate.mjs",
          python: "generate.py",
        })}
        response={`# when completed, your script prints something like:
https://cdn.example.com/videos/a1b2c3d4.mp4`}
        responseTitle="stdout"
      />

      <DocH2 id="checklist">Checklist</DocH2>
      <DocList>
        <li>Key set in env as <code>MANIMOTION_KEY</code></li>
        <li>Header <code>x-api-key</code> on every call</li>
        <li>You saved <code>job_id</code> from the create response</li>
        <li>You poll until <code>completed</code>, then use <code>video_url</code></li>
      </DocList>
      <DocP>
        Next: full field docs in the{" "}
        <Link
          href="/docs/api"
          className="text-white underline-offset-2 hover:underline"
        >
          API reference
        </Link>
        , or send renders to your bucket in{" "}
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
