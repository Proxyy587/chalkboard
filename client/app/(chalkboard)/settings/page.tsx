import Link from "next/link";
import { KeyRound, HardDrive, Sparkles } from "lucide-react";

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-4">
      <section className="mm-panel p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--mm-accent)]" strokeWidth={1.5} />
          <div className="space-y-3">
            <h2 className="text-[13px] text-zinc-200">Ship with manimotion</h2>
            <p className="max-w-xl text-[12px] leading-relaxed text-zinc-500">
              Create an API key for the video worker, then attach your own bucket so renders land
              in your storage.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/settings/api-keys" className="mm-pixel-btn inline-flex px-4 py-2">
                Create API key
              </Link>
              <Link href="/settings/storage" className="mm-ghost-btn inline-flex px-4 py-2">
                Add storage
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings/api-keys"
          className="mm-panel group block p-4 transition-colors hover:border-white/25"
        >
          <KeyRound className="size-4 text-zinc-500 group-hover:text-[var(--mm-accent)]" strokeWidth={1.5} />
          <h3 className="mt-3 text-[12px] text-zinc-200">API keys</h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            Shown once. We store a SHA-256 hash only. Use{" "}
            <code className="text-zinc-400">x-api-key</code> on requests.
          </p>
        </Link>
        <Link
          href="/settings/storage"
          className="mm-panel group block p-4 transition-colors hover:border-white/25"
        >
          <HardDrive className="size-4 text-zinc-500 group-hover:text-[var(--mm-accent)]" strokeWidth={1.5} />
          <h3 className="mt-3 text-[12px] text-zinc-200">Storage</h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            R2, S3, MinIO, Backblaze, UploadThing. Credentials encrypted at rest
            (AES-256-GCM).
          </p>
        </Link>
      </div>
    </div>
  );
}
