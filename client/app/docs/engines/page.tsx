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
import { CREATE_JOB_RESPONSE, asTabs } from "@/lib/docs-examples";

const TOC = [
  { id: "pick", label: "Which engine?" },
  { id: "auto", label: "auto" },
  { id: "manim", label: "manim" },
  { id: "remotion", label: "remotion" },
  { id: "examples", label: "Examples" },
];

export default function DocsEnginesPage() {
  return (
    <DocShell toc={TOC}>
      <p className="mm-label">API</p>
      <DocH1>Engines</DocH1>
      <DocLead>
        Two render engines, one API. Pass <code>engine</code> on{" "}
        <code>POST /video/request</code>, or leave it on <code>auto</code>.
      </DocLead>

      <DocH2 id="pick">Which engine?</DocH2>
      <DocTable
        headers={["engine", "Best for"]}
        rows={[
          [
            <code key="a">auto</code>,
            "Default. Router picks based on the prompt.",
          ],
          [
            <code key="m">manim</code>,
            "Math, physics, LaTeX, graphs, geometric proofs",
          ],
          [
            <code key="r">remotion</code>,
            "Charts, timelines, cards, typography-heavy explainers",
          ],
        ]}
      />

      <DocH2 id="auto">auto</DocH2>
      <DocP>
        Use this unless you already know. Wrong forced engines waste time —
        Remotion struggling with a 12-step derivation, or Manim fighting a
        dashboard layout.
      </DocP>

      <DocH2 id="manim">manim</DocH2>
      <DocList>
        <li>Equations that transform step by step</li>
        <li>Coordinate planes, vectors, graphs</li>
        <li>Geometry / trigonometry demos</li>
      </DocList>
      <CodeTabs
        className="mt-4"
        examples={asTabs(
          {
            curl: `curl -sS -X POST "$MANIMOTION_API/video/request" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $MANIMOTION_KEY" \\
  -d '{
    "prompt": "Derive the quadratic formula with TransformMatchingTex steps",
    "engine": "manim"
  }'`,
            javascript: `await fetch(\`\${process.env.MANIMOTION_API}/video/request\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.MANIMOTION_KEY,
  },
  body: JSON.stringify({
    prompt: "Derive the quadratic formula with TransformMatchingTex steps",
    engine: "manim",
  }),
}).then((r) => r.json());`,
            python: `requests.post(
    f"{API}/video/request",
    headers={"Content-Type": "application/json", "x-api-key": KEY},
    json={
        "prompt": "Derive the quadratic formula with TransformMatchingTex steps",
        "engine": "manim",
    },
).json()`,
          },
          {
            curl: "manim.sh",
            javascript: "manim.mjs",
            python: "manim.py",
          }
        )}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="remotion">remotion</DocH2>
      <DocList>
        <li>Bar / line charts that grow with narration</li>
        <li>Timelines and process diagrams</li>
        <li>Card stacks, comparisons, UI-style explainers</li>
      </DocList>
      <CodeTabs
        className="mt-4"
        examples={asTabs(
          {
            curl: `curl -sS -X POST "$MANIMOTION_API/video/request" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $MANIMOTION_KEY" \\
  -d '{
    "prompt": "Compare HTTP vs WebSockets with a clean timeline of use cases",
    "engine": "remotion",
    "duration": 60
  }'`,
            javascript: `await fetch(\`\${process.env.MANIMOTION_API}/video/request\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.MANIMOTION_KEY,
  },
  body: JSON.stringify({
    prompt: "Compare HTTP vs WebSockets with a clean timeline of use cases",
    engine: "remotion",
    duration: 60,
  }),
}).then((r) => r.json());`,
            python: `requests.post(
    f"{API}/video/request",
    headers={"Content-Type": "application/json", "x-api-key": KEY},
    json={
        "prompt": "Compare HTTP vs WebSockets with a clean timeline of use cases",
        "engine": "remotion",
        "duration": 60,
    },
).json()`,
          },
          {
            curl: "remotion.sh",
            javascript: "remotion.mjs",
            python: "remotion.py",
          }
        )}
        response={CREATE_JOB_RESPONSE}
      />

      <DocH2 id="examples">Examples worth stealing</DocH2>
      <div className="mt-4">
        <DocCallout title="Tip" tone="default">
          <p>
            If a Manim job fails on a “soft” topic (history, product UX), retry
            with <code>engine: &quot;remotion&quot;</code>. If Remotion fails on
            heavy math, force <code>manim</code>.
          </p>
        </DocCallout>
      </div>
      <DocP>
        Full request fields →{" "}
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
