"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  api,
  setSession,
  type GoogleAuthResponse,
  type Principal,
} from "@/lib/api";
import { GoogleSignInButton } from "@/components/google-signin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">You&apos;ve been invited</CardTitle>
          <CardDescription>
            {preview
              ? `Join ${preview.agency_name} on Agency AI Brain`
              : "Agency AI Brain"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadErr ? (
            <p className="text-sm text-red-600">{loadErr}</p>
          ) : !preview ? (
            <p className="text-sm text-muted-foreground">Loading invite…</p>
          ) : !preview.valid ? (
            <p className="text-sm text-red-600">
              This invite has expired or already been used.
            </p>
          ) : (
            <>
              <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Agency</span>{" "}
                  <span className="font-medium">{preview.agency_name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Client</span>{" "}
                  <span className="font-medium">{preview.client_name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Role</span>{" "}
                  <span className="font-medium">{preview.role}</span>
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Sign in with Google ({preview.email}) to accept
                </p>
                <GoogleSignInButton onCredential={onCredential} />
                {busy && <p className="text-sm text-muted-foreground">Accepting…</p>}
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
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
