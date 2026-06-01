"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getToken, type Integration } from "@/lib/api";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PROVIDERS = [
  { id: "slack", name: "Slack", desc: "Channels & messages", live: true },
  { id: "jira", name: "Jira", desc: "Tickets & status", live: true },
  { id: "gmail", name: "Gmail", desc: "Client emails (matched by domain)", live: true },
  { id: "drive", name: "Google Drive", desc: "Shared docs", live: false },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIntegrations(await api<Integration[]>("/integrations"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const connectedProvider = new URLSearchParams(window.location.search).get(
      "connected"
    );
    if (connectedProvider) {
      toast.success(`${connectedProvider} connected!`);
    }
    load();
  }, [router, load]);

  const connected = (id: string) =>
    integrations.find((i) => i.provider === id);

  async function connect(provider: string) {
    setConnecting(true);
    try {
      const { url } = await api<{ url: string }>(
        `/integrations/${provider}/connect`
      );
      window.location.href = url; // hand off to the provider's OAuth screen
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setConnecting(false);
    }
  }

  async function disconnect(provider: string) {
    try {
      await api(`/integrations/${provider}`, { method: "DELETE" });
      toast.success(`${provider} disconnected`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect data sources. Ingested activity feeds every client&apos;s
            summary and answers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PROVIDERS.map((p) => {
            const conn = connected(p.id);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {conn ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Connected
                      </Badge>
                    ) : p.live ? null : (
                      <Badge variant="outline">Soon</Badge>
                    )}
                  </div>
                  <CardDescription>{p.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  {conn ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate">
                        {conn.workspace_name ?? "workspace"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnect(p.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : p.live ? (
                    <Button
                      onClick={() => connect(p.id)}
                      disabled={connecting || loading}
                    >
                      {connecting ? "Redirecting..." : `Connect ${p.name}`}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      Coming soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
