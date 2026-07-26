"use client";

import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [removeId, setRemoveId] = useState<string | null>(null);

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
      toast.success("Storage saved");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removeId) return;
    const id = removeId;
    setRemoveId(null);
    const res = await fetch(`/api/storage/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Remove failed");
      return;
    }
    toast.success("Storage removed");
    await load();
  }

  async function test(id: string) {
    const res = await fetch(`/api/storage/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      toast.success("Connection OK");
      await load();
    } else {
      toast.error(data.error ?? "Connection failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mm-label">Buckets</p>
          <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-foreground">
            Storage
          </h2>
          <p className="mt-2 max-w-lg text-[13px] text-[var(--muted-text)]">
            Videos upload to your bucket when configured. Credentials encrypted
            at rest.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5" />
          Add storage
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add storage</DialogTitle>
            <DialogDescription>
              Connect R2, S3, or another compatible bucket for finished MP4s.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My R2 bucket"
              />
            </div>
            <div>
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as Provider)}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <>
                <div>
                  <Label>Account ID</Label>
                  <Input
                    className="mt-2"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Access key ID</Label>
                  <Input
                    className="mt-2"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                  />
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
                <div>
                  <Label>Bucket</Label>
                  <Input
                    className="mt-2"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Public URL (optional)</Label>
                  <Input
                    className="mt-2"
                    value={publicUrl}
                    onChange={(e) => setPublicUrl(e.target.value)}
                    placeholder="https://cdn.example.com"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Access key ID</Label>
                  <Input
                    className="mt-2"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                  />
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
                <div>
                  <Label>Bucket</Label>
                  <Input
                    className="mt-2"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    className="mt-2"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Endpoint (optional)</Label>
                  <Input
                    className="mt-2"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Public URL (optional)</Label>
                  <Input
                    className="mt-2"
                    value={publicUrl}
                    onChange={(e) => setPublicUrl(e.target.value)}
                  />
                </div>
              </>
            )}
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void saveIntegration()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="divide-y divide-border overflow-hidden rounded-[10px] border border-[var(--chip-line)]">
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--muted-2)]">
            INTEGRATIONS
          </p>
          <p className="text-[11px] tabular-nums text-[var(--muted-2)]">
            {integrations.length}
          </p>
        </div>
        {loading && <p className="p-6 text-[12px] text-[var(--muted-2)]">Loading…</p>}
        {!loading && integrations.length === 0 && (
          <p className="p-6 text-[12px] text-[var(--muted-2)]">
            No storage yet — add a bucket to upload finished lectures.
          </p>
        )}
        {integrations.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 px-4 py-3.5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-[var(--ink-soft)]">{row.name}</span>
                <Badge variant="outline">{row.provider}</Badge>
                {row.isVerified && <Badge variant="default">verified</Badge>}
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted-2)]">
                <code className="text-[var(--muted-text)]">{row.id}</code>
                {row.bucketName ? ` · ${row.bucketName}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void test(row.id)}
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-400"
                onClick={() => setRemoveId(row.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </section>

      <AlertDialog
        open={removeId != null}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove storage?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing videos stay in your bucket. New jobs will use the default
              worker storage unless you pass another integration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/15 text-red-400 hover:bg-red-500/25"
              onClick={() => void confirmRemove()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
