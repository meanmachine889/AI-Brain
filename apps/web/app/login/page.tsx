"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, type GoogleAuthResponse, type InvitePreview } from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-signin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Onboarding = {
  onboarding_token: string;
  identity: { email: string; name: string };
  invites: InvitePreview[];
};

export default function LoginPage() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onCredential = useCallback(
    async (idToken: string) => {
      setError("");
      setBusy(true);
      try {
        const res = await api<GoogleAuthResponse>("/auth/google", {
          method: "POST",
          body: JSON.stringify({ id_token: idToken }),
        });
        if (res.status === "ok") {
          setToken(res.token);
          router.push("/");
          return;
        }
        // needs onboarding: offer "create your agency" (+ surface any invites)
        setOnboarding({
          onboarding_token: res.onboarding_token,
          identity: res.identity,
          invites: res.invites,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  async function createAgency(e: React.FormEvent) {
    e.preventDefault();
    if (!onboarding) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ token: string }>("/auth/create-agency", {
        method: "POST",
        body: JSON.stringify({
          onboarding_token: onboarding.onboarding_token,
          agency_name: agencyName,
          name: onboarding.identity.name,
        }),
      });
      setToken(res.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agency");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">🧠 Agency AI Brain</CardTitle>
          <CardDescription>
            {onboarding
              ? "Set up your agency to get started"
              : "Instant client context for your agency"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!onboarding ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <GoogleSignInButton onCredential={onCredential} />
              {busy && <p className="text-sm text-muted-foreground">Signing in…</p>}
            </div>
          ) : (
            <>
              {onboarding.invites.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm font-medium">You have a pending invite</p>
                  {onboarding.invites.map((inv, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {inv.agency_name} · {inv.client_name} as{" "}
                      <span className="font-medium">{inv.role}</span>
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Open the invite link you were sent to join. Or create your own
                    agency below.
                  </p>
                </div>
              )}

              <form onSubmit={createAgency} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="agency">Agency name</Label>
                  <Input
                    id="agency"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Acme Studio"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Signed in as {onboarding.identity.email}
                </p>
                <Button type="submit" className="w-full" disabled={busy || !agencyName.trim()}>
                  {busy ? "Creating…" : "Create agency"}
                </Button>
              </form>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
