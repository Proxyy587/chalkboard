import Link from "next/link";

import { CodeBlock } from "@/components/docs/code-block";
import {
  DocCallout,
  DocH1,
  DocH2,
  DocLead,
  DocList,
  DocP,
  DocShell,
} from "@/components/docs/doc-primitives";

const TOC = [
  { id: "before", label: "Before you start" },
  { id: "layout", label: "Repo layout" },
  { id: "web", label: "Web app" },
  { id: "worker", label: "Video worker" },
  { id: "prs", label: "Pull requests" },
  { id: "dont", label: "Don’ts" },
];

export default function DocsContributingPage() {
  return (
    <DocShell toc={TOC}>
      <p className="mm-label">Project</p>
      <DocH1>Contributing</DocH1>
      <DocLead>
        Building on the codebase? This page is for you. Shipping videos via the
        public API? Start at the{" "}
        <Link
          href="/docs"
          className="text-white underline-offset-2 hover:underline"
        >
          Introduction
        </Link>
        .
      </DocLead>

      <DocH2 id="before">Before you start</DocH2>
      <DocList>
        <li>Open or claim an issue before large changes.</li>
        <li>One problem per PR. Small diffs get merged faster.</li>
        <li>Never commit <code>.env</code> or real API keys.</li>
      </DocList>

      <DocH2 id="layout">Repo layout</DocH2>
      <CodeBlock
        className="mt-4"
        title="tree"
        lang="bash"
        code={`manim-vid/
  client/          # Next.js — UI, docs, settings, Better Auth, Prisma
  main.py          # FastAPI video worker (VPS)
  worker.py        # generation pipeline
  prompts/         # live LLM prompts
  remotion-src/    # Remotion compositions
  schema/          # Pydantic models (VideoRequest, etc.)`}
      />
      <DocP>
        Web and worker are separate deploys. Vercel Root Directory ={" "}
        <code>client</code>. Python stays on a GPU/CPU box that can render.
      </DocP>

      <DocH2 id="web">Web app (client/)</DocH2>
      <CodeBlock
        className="mt-4"
        title="setup"
        lang="bash"
        code={`cd client
bun install
cp .env.example .env
bunx prisma generate && bunx prisma db push
bun run dev`}
      />
      <DocList>
        <li>
          Docs: <code>app/docs/</code>
        </li>
        <li>
          Prisma: <code>prisma/schema.prisma</code>
        </li>
        <li>
          Deploy notes: <code>client/DEPLOY.md</code>
        </li>
      </DocList>

      <DocH2 id="worker">Video worker</DocH2>
      <CodeBlock
        className="mt-4"
        title="worker"
        lang="bash"
        code={`uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
# client/.env → NEXT_PUBLIC_CHALKBOARD_API_URL=http://127.0.0.1:8000`}
      />
      <div className="mt-4">
        <DocCallout title="Prompts" tone="accent">
          <p>
            Quality changes usually live in <code>prompts/</code>. Don’t edit
            random copies under <code>prompt-docs/</code> unless you mean to
            update the archive.
          </p>
        </DocCallout>
      </div>

      <DocH2 id="prs">Pull requests</DocH2>
      <DocList>
        <li>Say what broke and how you tested (UI path or curl).</li>
        <li>Match existing style — no drive-by renames.</li>
        <li>
          Prisma changes → run <code>db push</code> and mention it in the PR.
        </li>
      </DocList>

      <DocH2 id="dont">Don’ts</DocH2>
      <DocList>
        <li>Don’t paste real secrets into docs examples.</li>
        <li>Don’t couple Next to local Python paths for production.</li>
        <li>Don’t expand docs into marketing fluff — keep them useful.</li>
      </DocList>
    </DocShell>
  );
}
