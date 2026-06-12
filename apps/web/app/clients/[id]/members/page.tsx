"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  api,
  getToken,
  type Client,
  type ClientMemberRow,
  type Role,
} from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { PersonAvatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  tag: string | null;
  expires_at: string;
  used: boolean;
  expired: boolean;
};

const roleClasses =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ClientMembersPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<ClientMemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // invite form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [tag, setTag] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api<Client>(`/clients/${id}`);
      setClient(c);
      const [m, inv] = await Promise.all([
        api<ClientMemberRow[]>(`/clients/${id}/members`),
        api<InviteRow[]>(`/clients/${id}/invites`),
      ]);
      setMembers(m);
      setInvites(inv);
    } catch (err) {
      if (err instanceof Error && /not allowed|owner|forbidden/i.test(err.message)) {
        setForbidden(true);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || inviting) return;
    setInviting(true);
    try {
      const res = await api<{ invite_url: string }>(`/clients/${id}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role, tag: tag.trim() || null }),
      });
      await navigator.clipboard.writeText(res.invite_url).catch(() => {});
      toast.success("Invite created — link copied to clipboard");
      setEmail("");
      setTag("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invite");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(memberId: string, next: Role) {
    setMembers((ms) => ms.map((m) => (m.member_id === memberId ? { ...m, role: next } : m)));
    try {
      await api(`/clients/${id}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: next }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      load();
    }
  }

  async function removeMember(memberId: string) {
    setMembers((ms) => ms.filter((m) => m.member_id !== memberId));
    try {
      await api(`/clients/${id}/members/${memberId}`, { method: "DELETE" });
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      load();
    }
  }

  async function revokeInvite(inviteId: string) {
    setInvites((is) => is.filter((i) => i.id !== inviteId));
    try {
      await api(`/clients/${id}/invites/${inviteId}`, { method: "DELETE" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      load();
    }
  }

  return (
    <AppShell title={client?.name ?? "Members"}>
      <div className="canvas-warm h-full overflow-y-auto">
        <div className="w-full px-6 pb-10 pt-8">
          <PageHeader
            title="Members"
            description="Who can see this client, and at what level."
          />

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : forbidden ? (
            <p className="text-sm text-muted-foreground">
              Only the agency owner can manage members.
            </p>
          ) : (
            <>
              {/* invite form */}
              <form
                onSubmit={invite}
                className="mb-8 grid gap-3 rounded-xl bg-card p-4 shadow-soft sm:grid-cols-[1fr_auto_1fr_auto]"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Google email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="person@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className={roleClasses}
                  >
                    <option value="viewer">viewer</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag" className="text-xs">Tag (optional)</Label>
                  <Input
                    id="tag"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Designer"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={inviting || !email.trim()}>
                    {inviting ? "…" : "Invite"}
                  </Button>
                </div>
              </form>

              {/* members */}
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Members ({members.length})
              </h2>
              {members.length === 0 ? (
                <p className="mb-8 text-sm text-muted-foreground">
                  No members yet. Invite someone above.
                </p>
              ) : (
                <ul className="mb-8 divide-y divide-border/60 rounded-xl bg-card shadow-soft">
                  {members.map((m) => (
                    <li key={m.member_id} className="flex items-center gap-3 px-4 py-3">
                      <PersonAvatar
                        seed={m.email}
                        alt={m.name}
                        className="size-8 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.name}
                          {m.tag && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              {m.tag}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.member_id, e.target.value as Role)}
                        className={roleClasses}
                      >
                        <option value="viewer">viewer</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        onClick={() => removeMember(m.member_id)}
                        className="text-muted-foreground transition hover:text-destructive"
                        aria-label="Remove member"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* pending invites */}
              {invites.length > 0 && (
                <>
                  <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                    Pending invites ({invites.length})
                  </h2>
                  <ul className="divide-y divide-border/60 rounded-xl bg-card shadow-soft">
                    {invites.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                        <PersonAvatar
                          seed={i.email}
                          alt={i.email}
                          className="size-8 shrink-0 opacity-60"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{i.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {i.role}
                            {i.tag ? ` · ${i.tag}` : ""} ·{" "}
                            {i.used
                              ? "used"
                              : i.expired
                                ? "expired"
                                : `expires ${relativeTime(i.expires_at)}`}
                          </p>
                        </div>
                        <button
                          onClick={() => revokeInvite(i.id)}
                          className="text-xs text-muted-foreground transition hover:text-destructive"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
