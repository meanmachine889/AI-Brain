"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getToken, type Client } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// /dashboard resolves to the oldest client. It only renders UI for onboarding
// (no clients yet) or when ?add=1 is passed to create another client.
export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const resolve = useCallback(async () => {
    const forceAdd =
      new URLSearchParams(window.location.search).get("add") === "1";
    try {
      const clients = await api<Client[]>("/clients");
      if (clients.length > 0 && !forceAdd) {
        const oldest = [...clients].sort(
          (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
        )[0];
        router.replace(`/clients/${oldest.id}`);
        return;
      }
      setReady(true); // show the add-client screen
    } catch {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    resolve();
  }, [router, resolve]);

  return (
    <AppShell title="New client">
      <div className="mx-auto flex max-w-xl flex-col px-4 py-16">
        {!ready ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Add a client</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a client, then map its data sources — Slack channels, a Jira
              project, or an email domain. The brain builds from there.
            </p>
            <div className="mt-6">
              <AddClientForm
                onCreated={(id) => router.replace(`/clients/${id}`)}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function AddClientForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [channels, setChannels] = useState("");
  const [jiraKeys, setJiraKeys] = useState("");
  const [saving, setSaving] = useState(false);

  const split = (s: string) =>
    s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const c = await api<Client>("/clients", {
        method: "POST",
        body: JSON.stringify({
          name,
          domain: domain || null,
          slack_channel_ids: split(channels),
          jira_project_keys: split(jiraKeys),
        }),
      });
      toast.success("Client created");
      onCreated(c.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const fields: [string, string, (v: string) => void, string][] = [
    ["Client name", name, setName, "Acme Corp"],
    ["Email domain (optional)", domain, setDomain, "acme.com"],
    ["Slack channel IDs (optional)", channels, setChannels, "C012..."],
    ["Jira project keys (optional)", jiraKeys, setJiraKeys, "KAN"],
  ];

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-xl border bg-muted/30 p-5 shadow-soft"
    >
      {fields.map(([label, value, set, ph]) => (
        <div key={label} className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{label}</label>
          <Input value={value} onChange={(e) => set(e.target.value)} placeholder={ph} />
        </div>
      ))}
      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? "Creating..." : "Create client"}
      </Button>
    </form>
  );
}
