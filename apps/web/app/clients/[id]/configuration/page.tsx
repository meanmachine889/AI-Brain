"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type Client } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useWorkspace } from "@/components/app-data";
import { MultiInput } from "@/components/multi-input";
import {
  PROVIDER_ICON,
  PROVIDER_LABEL,
  type Provider,
} from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Section({
  icon,
  title,
  desc,
  soon,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-card p-4 shadow-soft">
      <div className="mb-1 flex items-center gap-2">
        {icon && <span className="grid size-4 place-items-center [&_svg]:size-4">{icon}</span>}
        <h2 className="text-[13px] font-[590] tracking-[-0.01em]">{title}</h2>
        {soon && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-[510] uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        )}
      </div>
      {desc && <p className="mb-3 text-xs text-muted-foreground">{desc}</p>}
      {children}
    </section>
  );
}

function ProviderIcon({ p }: { p: Provider }) {
  const Icon = PROVIDER_ICON[p];
  return <Icon className="size-5" />;
}

function ConfigForm({ client }: { client: Client }) {
  const router = useRouter();
  const { load } = useWorkspace();

  const [name, setName] = useState(client.name);
  const [domain, setDomain] = useState(client.domain ?? "");
  const [contacts, setContacts] = useState<string[]>(client.contact_emails);
  const [channels, setChannels] = useState<string[]>(client.slack_channel_ids);
  const [jiraKeys, setJiraKeys] = useState<string[]>(client.jira_project_keys);
  const [folders, setFolders] = useState<string[]>(client.drive_folder_ids);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          domain: domain.trim() || null,
          contact_emails: contacts,
          slack_channel_ids: channels,
          jira_project_keys: jiraKeys,
          drive_folder_ids: folders,
        }),
      });
      await load(); // refresh rail/panel (name, mapping)
      toast.success("Configuration saved");
      router.push(`/clients/${client.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "mb-1.5 block text-[11px] font-[510] uppercase tracking-[0.05em] text-muted-foreground";

  return (
    <>
      <PageHeader
        title="Configuration"
        description="Map this client's sources, then save to refresh its picture."
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => router.push(`/clients/${client.id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="font-[510]">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
      {/* Client */}
      <Section title="Client" desc="How this client is identified across the workspace.">
        <label className={labelCls}>Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-[13px]"
          placeholder="Acme Inc."
        />
      </Section>

      {/* Slack */}
      <Section
        icon={<ProviderIcon p="slack" />}
        title={PROVIDER_LABEL.slack}
        desc="Channel IDs whose messages feed this client's brain."
      >
        <MultiInput
          values={channels}
          onChange={setChannels}
          placeholder="C0123ABCD"
          mono
        />
      </Section>

      {/* Jira */}
      <Section
        icon={<ProviderIcon p="jira" />}
        title={PROVIDER_LABEL.jira}
        desc="Project keys to pull issues from."
      >
        <MultiInput values={jiraKeys} onChange={setJiraKeys} placeholder="KAN" mono />
      </Section>

      {/* Gmail */}
      <Section
        icon={<ProviderIcon p="gmail" />}
        title={PROVIDER_LABEL.gmail}
        desc="Emails are matched to this client by domain and/or specific contacts."
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Domain</label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mono h-9 text-[13px]"
              placeholder="acme.com"
            />
          </div>
          <div>
            <label className={labelCls}>Contact emails</label>
            <MultiInput
              values={contacts}
              onChange={setContacts}
              placeholder="jane@acme.com"
              mono
            />
          </div>
        </div>
      </Section>

      {/* Drive */}
      <Section
        icon={<ProviderIcon p="drive" />}
        title={PROVIDER_LABEL.drive}
        desc="Folder IDs to ingest shared docs from."
        soon
      >
        <MultiInput
          values={folders}
          onChange={setFolders}
          placeholder="1AbC...folderId"
          mono
        />
      </Section>
      </div>
    </>
  );
}

// Runs inside <AppShell>, so useWorkspace() has its provider.
function ConfigurationContent() {
  const params = useParams<{ id: string }>();
  const { clients, loading: wsLoading } = useWorkspace();
  const fromWs = clients.find((c) => c.id === params.id) ?? null;

  // Fall back to a direct fetch on a cold/deep load where the cache is empty.
  const [client, setClient] = useState<Client | null>(fromWs);
  useEffect(() => {
    if (fromWs) {
      setClient(fromWs);
      return;
    }
    if (!wsLoading) {
      api<Client>(`/clients/${params.id}`)
        .then(setClient)
        .catch((err) =>
          toast.error(err instanceof Error ? err.message : "Failed to load"),
        );
    }
  }, [fromWs, wsLoading, params.id]);

  return (
    <div className="w-full px-6 pb-10 pt-8">
      {client ? (
        <ConfigForm client={client} />
      ) : (
        <>
          <PageHeader
            title="Configuration"
            description="Map this client's sources, then save to refresh its picture."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ConfigurationPage() {
  return (
    <AppShell title="Configuration">
      <ConfigurationContent />
    </AppShell>
  );
}
