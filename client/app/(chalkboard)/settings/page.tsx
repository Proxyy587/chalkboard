import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-6">
      <section className="border border-white/10 bg-black/25 p-5">
        <h2 className="text-[11px] tracking-[0.16em] text-zinc-400">GET STARTED</h2>
        <p className="mt-3 max-w-xl text-[12px] leading-relaxed text-zinc-500">
          Create an API key to authenticate video requests against the Clarity worker. Connect your
          own R2, S3, or UploadThing bucket so renders land in your storage — not ours.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/settings/api-keys">Create API key</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/storage">Add storage</Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-white/10 bg-black/20 p-4">
          <h3 className="text-[10px] tracking-[0.14em] text-[#dfff00]">API KEYS</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Keys are shown once. We store only a SHA-256 hash. Plans and credits are on the schema
            for when billing ships — no limits enforced yet on FREE.
          </p>
        </div>
        <div className="border border-white/10 bg-black/20 p-4">
          <h3 className="text-[10px] tracking-[0.14em] text-[#dfff00]">STORAGE</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Credentials are encrypted with AES-256-GCM before storage. Connection is tested before
            save. Supports R2, S3, MinIO, Backblaze B2, and UploadThing.
          </p>
        </div>
      </section>
    </div>
  );
}
