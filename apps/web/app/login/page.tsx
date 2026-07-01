"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { api, setSession, type GoogleAuthResponse, type InvitePreview } from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-signin";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          setSession(res.token, res.refresh_token);
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
      const res = await api<{ token: string; refresh_token: string }>("/auth/create-agency", {
        method: "POST",
        body: JSON.stringify({
          onboarding_token: onboarding.onboarding_token,
          agency_name: agencyName,
          name: onboarding.identity.name,
        }),
      });
      setSession(res.token, res.refresh_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agency");
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      {/* top bar */}
      <div className="flex items-center justify-between px-8 pt-8 sm:px-12">
        <div className="flex items-center gap-2 md:hidden">
          <Logo className="size-7" />
          <span className="font-[family-name:var(--font-poppins)] text-sm font-semibold">
            Neuron
          </span>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          {onboarding ? "Setting up your workspace" : "Instant client context"}
        </p>
      </div>

      {/* centered form */}
      <div className="flex flex-1 items-center justify-center px-8 py-10 sm:px-12">
        <motion.div
          key={onboarding ? "onboarding" : "signin"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {!onboarding ? (
            <>
              <div className="text-center">
                <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-semibold tracking-tight">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in to your agency workspace
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-4">
                <GoogleSignInButton onCredential={onCredential} />
                {busy && (
                  <p className="text-sm text-muted-foreground">Signing in…</p>
                )}
              </div>

              <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
                New here? Sign in with Google and we&apos;ll set up your agency
                in one step.
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-semibold tracking-tight">
                  Name your agency
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This is your workspace — you can invite your team later.
                </p>
              </div>

              {onboarding.invites.length > 0 && (
                <div className="mt-6 space-y-2 rounded-xl bg-muted/50 p-4 ring-hairline">
                  <p className="text-sm font-medium">You have a pending invite</p>
                  {onboarding.invites.map((inv, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {inv.agency_name} · {inv.client_name} as{" "}
                      <span className="font-medium text-foreground">{inv.role}</span>
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Open the invite link you were sent to join instead — or create
                    your own agency below.
                  </p>
                </div>
              )}

              <form onSubmit={createAgency} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agency">Agency name</Label>
                  <Input
                    id="agency"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Acme Studio"
                    className="h-11"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="group h-11 w-full"
                  disabled={busy || !agencyName.trim()}
                >
                  {busy ? "Creating…" : "Create agency"}
                  {!busy && (
                    <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Signed in as {onboarding.identity.email}
                </p>
              </form>
            </>
          )}

          {error && (
            <p className="mt-5 text-center text-sm text-destructive">{error}</p>
          )}
        </motion.div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between px-8 pb-8 text-xs text-muted-foreground sm:px-12">
        <span>© {new Date().getFullYear()} Neuron</span>
        <div className="flex items-center gap-5">
          <span>Privacy</span>
          <span>Support</span>
        </div>
      </div>
    </AuthShell>
  );
}
