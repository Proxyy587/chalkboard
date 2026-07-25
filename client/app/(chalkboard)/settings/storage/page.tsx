"use client";

import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Provider = "R2" | "S3" | "UPLOADTHING" | "MINIO" | "CUSTOM_S3" | "BACKBLAZE";

type Integration = {
  id: string;
  name: string;
  provider: Provider;
  bucketName: string;
  region: string | null;
  publicUrl: string | null;
  isVerified: boolean;
  createdAt: string;
};

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "R2", label: "Cloudflare R2" },
  { id: "S3", label: "AWS S3" },
  { id: "UPLOADTHING", label: "UploadThing" },
  { id: "MINIO", label: "MinIO" },
  { id: "CUSTOM_S3", label: "S3-compatible" },
  { id: "BACKBLAZE", label: "Backblaze B2" },
];

export default function StorageSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<Provider>("R2");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // R2 / S3 fields
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("auto");
  const [endpoint, setEndpoint] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [uploadThingToken, setUploadThingToken] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setIntegrations(data.integrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function buildPayload() {
    if (provider === "UPLOADTHING") {
      return {
        provider,
        name: name.trim(),
        config: { token: uploadThingToken.trim() },
      };
    }
    if (provider === "R2") {
      return {
        provider,
        name: name.trim(),
        config: {
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
          accountId: accountId.trim(),
          bucketName: bucketName.trim(),
          publicUrl: publicUrl.trim() || undefined,
        },
      };
    }
    return {
      provider,
      name: name.trim(),
      config: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: region.trim() || "us-east-1",
        bucketName: bucketName.trim(),
        endpoint: endpoint.trim() || undefined,
        publicUrl: publicUrl.trim() || undefined,
        forcePathStyle: provider === "MINIO" || provider === "CUSTOM_S3",
      },
    };
  }

  async function saveIntegration() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setShowForm(false);
      setName("");
      setAccessKeyId("");
      setSecretAccessKey("");
      setAccountId("");
      setBucketName("");
      setUploadThingToken("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this storage integration?")) return;
    await fetch(`/api/storage/${id}`, { method: "DELETE" });
    await load();
  }

  async function test(id: string) {
    const res = await fetch(`/api/storage/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      alert("Connection OK");
      await load();
    } else {
      alert(data.error ?? "Connection failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[13px] text-zinc-200">Storage</h2>
          <p className="mt-1 max-w-lg text-[12px] text-zinc-500">
            Videos upload to your bucket when configured. Credentials encrypted at rest.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" />
          Add storage
        </Button>
      </div>

      {showForm && (
        <div className="mm-panel space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="My R2 bucket" />
            </div>
            <div>
              <Label>Provider</Label>
              <select
                className="mt-2 flex h-9 w-full border border-white/15 bg-black/40 px-3 text-[11px] text-zinc-100"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {provider === "UPLOADTHING" ? (
            <div>
              <Label>API token</Label>
              <Input
                className="mt-2"
                type="password"
                value={uploadThingToken}
                onChange={(e) => setUploadThingToken(e.target.value)}
              />
            </div>
          ) : provider === "R2" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Account ID</Label>
                <Input className="mt-2" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
              </div>
              <div>
                <Label>Bucket</Label>
                <Input className="mt-2" value={bucketName} onChange={(e) => setBucketName(e.target.value)} />
              </div>
              <div>
                <Label>Access key ID</Label>
                <Input className="mt-2" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} />
              </div>
              <div>
                <Label>Secret access key</Label>
                <Input
                  className="mt-2"
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Public URL (optional CDN)</Label>
                <Input className="mt-2" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="https://pub-xxx.r2.dev" />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Bucket</Label>
                <Input className="mt-2" value={bucketName} onChange={(e) => setBucketName(e.target.value)} />
              </div>
              <div>
                <Label>Region</Label>
                <Input className="mt-2" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div>
                <Label>Access key ID</Label>
                <Input className="mt-2" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} />
              </div>
              <div>
                <Label>Secret access key</Label>
                <Input
                  className="mt-2"
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Endpoint (for MinIO / custom S3)</Label>
                <Input className="mt-2" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Public URL prefix</Label>
                <Input className="mt-2" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={saveIntegration} disabled={saving || !name.trim()}>
              {saving ? "Testing & saving…" : "Save integration"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="border border-white/10 divide-y divide-white/10">
        {loading && <p className="p-6 text-[11px] text-zinc-600">Loading…</p>}
        {!loading && integrations.length === 0 && (
          <p className="p-6 text-[11px] text-zinc-600">
            No storage configured — videos use the server default bucket.
          </p>
        )}
        {integrations.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-zinc-200">{row.name}</span>
                <Badge variant="outline">{row.provider}</Badge>
                {row.isVerified ? (
                  <Badge variant="lime">verified</Badge>
                ) : (
                  <Badge variant="secondary">unverified</Badge>
                )}
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">
                <code className="text-zinc-500">{row.id}</code>
                <span className="mx-2">·</span>
                {row.bucketName}
                {row.publicUrl && ` · ${row.publicUrl}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => test(row.id)}>
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-400"
                onClick={() => remove(row.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-white/10 bg-black/20 p-4">
        <p className="mm-label">Use in API</p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Pass <code className="text-zinc-400">storage.integration_id</code> with the id above, or inline
          R2/S3 credentials per request (never stored — job-scoped only).
        </p>
        <pre className="mt-3 overflow-x-auto border border-white/10 bg-black/50 p-3 text-[9px] text-zinc-400">
{`curl -X POST http://localhost:8000/video/request \\
  -H "x-api-key: chalk_live_sk_v1_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Explain eigenvectors",
    "storage": { "integration_id": "YOUR_INTEGRATION_ID" }
  }'`}
        </pre>
      </div>
    </div>
  );
}
