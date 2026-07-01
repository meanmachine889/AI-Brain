"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  api,
  setSession,
  type GoogleAuthResponse,
  type Principal,
} from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-signin";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/logo";

type Preview = {
  agency_name: string;
  client_name: string;
  role: string;
  email: string;
  valid: boolean;
};

function AcceptInviteView() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoadErr("This invite link is missing its token.");
      return;
    }
    api<Preview>(`/auth/invite-preview?token=${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch(() => setLoadErr("This invite is invalid or has expired."));
  }, [token]);

  const onCredential = useCallback(
    async (idToken: string) => {
      setBusy(true);
      setError("");
      try {
        const auth = await api<GoogleAuthResponse>("/auth/google", {
          method: "POST",
          body: JSON.stringify({ id_token: idToken }),
        });
        // existing member -> establish session first so accept is authenticated;
        // brand-new user -> pass the onboarding token instead.
        const body: { invite_token: string; onboarding_token?: string } = {
          invite_token: token,
        };
        if (auth.status === "ok") {
          // establish a session so the accept call is authenticated
          setSession(auth.token, auth.refresh_token);
        } else {
          body.onboarding_token = auth.onboarding_token;
        }
        const res = await api<{ token: string; refresh_token: string; principal: Principal }>(
          "/auth/accept-invite",
          { method: "POST", body: JSON.stringify(body) }
        );
        setSession(res.token, res.refresh_token);
        const first = res.principal.memberships[0];
        router.push(first ? `/clients/${first.client_id}` : "/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not accept invite");
        setBusy(false);
      }
    },
    [router, token]
  );

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
        <p className="ml-auto text-xs text-muted-foreground">You&apos;ve been invited</p>
      </div>

      {/* centered form */}
      <div className="flex flex-1 items-center justify-center px-8 py-10 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {loadErr ? (
            <p className="text-center text-sm text-destructive">{loadErr}</p>
          ) : !preview ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
              <p className="text-sm text-muted-foreground">Loading invite…</p>
            </div>
          ) : !preview.valid ? (
            <p className="text-center text-sm text-destructive">
              This invite has expired or already been used.
            </p>
          ) : (
            <>
              <div className="text-center">
                <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-semibold tracking-tight">
                  Join {preview.agency_name}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  You&apos;ve been invited to collaborate on a client
                </p>
              </div>

              <div className="mt-6 space-y-3 rounded-xl bg-muted/50 p-4 ring-hairline">
                <Row label="Agency" value={preview.agency_name} />
                <Row label="Client" value={preview.client_name} />
                <Row label="Role" value={preview.role} />
              </div>

              <div className="mt-7 flex flex-col items-center gap-4">
                <p className="text-xs text-muted-foreground">
                  Sign in with Google ({preview.email}) to accept
                </p>
                <GoogleSignInButton onCredential={onCredential} />
                {busy && (
                  <p className="text-sm text-muted-foreground">Accepting…</p>
                )}
              </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteView />
    </Suspense>
  );
}
