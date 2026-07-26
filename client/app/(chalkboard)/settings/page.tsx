import Link from "next/link";
import { ArrowUpRight, BookOpen, HardDrive, KeyRound } from "lucide-react";

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="mm-label">Overview</p>
        <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-white">
          Production setup
        </h2>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-neutral-500">
          The home demo works without an account. Wire keys and storage when you
          call the worker from your own apps.
        </p>
      </header>

      <div className="grid border border-white/10 sm:grid-cols-2">
        <Link
          href="/settings/api-keys"
          className="mm-feature-cell mm-grain group block bg-black p-5 transition-colors hover:bg-neutral-950 sm:border-r-0"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] text-neutral-600">01</p>
            <KeyRound className="size-4 text-neutral-600" strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 text-[14px] font-semibold tracking-tight text-white">
            API key
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
            Authenticate with <code className="text-neutral-400">x-api-key</code>.
            Plaintext shown once — we store a hash only.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-white">
            Create key <ArrowUpRight className="size-3" />
          </span>
        </Link>

        <Link
          href="/settings/storage"
          className="mm-feature-cell mm-grain group block border-b-0 bg-black p-5 transition-colors hover:bg-neutral-950"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] text-neutral-600">02</p>
            <HardDrive className="size-4 text-neutral-600" strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 text-[14px] font-semibold tracking-tight text-white">
            Storage
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
            R2, S3, MinIO, Backblaze, UploadThing. Credentials encrypted
            AES-256-GCM.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-white">
            Add bucket <ArrowUpRight className="size-3" />
          </span>
        </Link>
      </div>

      <Link
        href="/docs"
        className="mm-grain flex items-center gap-3 rounded-none border border-white/10 bg-neutral-950 p-4 transition-colors hover:border-white/20"
      >
        <BookOpen className="size-4 text-neutral-400" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white">Documentation</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            Pipeline, API, auth, engines — reference docs.
          </p>
        </div>
        <ArrowUpRight className="size-3.5 text-neutral-600" />
      </Link>
    </div>
  );
}
