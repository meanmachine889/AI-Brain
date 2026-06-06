"use client";

import { useCallback, useEffect, useRef } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GIS_SRC = "https://accounts.google.com/gsi/client";

// minimal typing for the Google Identity Services global we use
type GisId = {
  initialize: (cfg: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GisId } };
  }
}

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(s);
  });
  return gisPromise;
}

export function GoogleSignInButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "continue_with";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useCallback(onCredential, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (resp) => cb(resp.credential),
        });
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          width: 280,
          text,
          shape: "pill",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cb, text]);

  if (!CLIENT_ID) {
    return (
      <p className="text-sm text-red-600">
        NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
      </p>
    );
  }
  return <div ref={ref} className="flex justify-center" />;
}
