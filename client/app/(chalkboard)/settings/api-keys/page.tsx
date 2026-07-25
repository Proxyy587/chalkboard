"use client";

import { AlertTriangle, Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { setStoredApiKey } from "@/lib/chalkboard-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  plan: string;
  usageCount: number;
  lastUsedAt: string | null;
};

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load keys");
      setKeys(data.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), environment: "live" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setCreatedKey(data.key);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string, keyName: string) {
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Revoke failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
          <h2 className="text-[13px] text-zinc-200">API keys</h2>
        <p className="mt-1 max-w-lg text-[12px] text-zinc-500">
          Header{" "}
          <code className="text-zinc-400">x-api-key: chalk_live_sk_v1_…</code>
        </p>
      </div>

      {createdKey && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[11px] text-amber-200/90">
                Copy this key now — it won&apos;t be shown again.
              </p>
              <code className="block break-all border border-white/10 bg-black/50 p-2 text-[10px]">
                {createdKey}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(createdKey)}
                >
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStoredApiKey(createdKey);
                    setCreatedKey(null);
                  }}
                >
                  Use in this browser
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreatedKey(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mm-panel p-4">
        <Label htmlFor="key-name">Name</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production"
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createKey();
              }
            }}
          />
          <Button type="button" onClick={createKey} disabled={creating || !name.trim()}>
            <Plus className="size-3.5" />
            {creating ? "Creating…" : "Create key"}
          </Button>
        </div>
        {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
      </div>

      <div className="mm-panel divide-y divide-white/10">
        {loading && <p className="p-6 text-[11px] text-zinc-600">Loading…</p>}
        {!loading && keys.length === 0 && (
          <p className="p-6 text-[11px] text-zinc-600">No keys yet.</p>
        )}
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-zinc-200">{key.name}</span>
                <Badge variant="outline">{key.environment}</Badge>
                <Badge variant="lime">{key.plan}</Badge>
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">
                <code>{key.prefix}…</code> · {key.usageCount} requests
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-400"
              onClick={() => revoke(key.id, key.name)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

