"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, type Client } from "@/lib/api";

// Entry point: send the user to the oldest client (single-client focus),
// or to onboarding if they have none.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<Client[]>("/clients")
      .then((clients) => {
        if (clients.length === 0) {
          router.replace("/dashboard?add=1");
          return;
        }
        const oldest = [...clients].sort(
          (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
        )[0];
        router.replace(`/clients/${oldest.id}`);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return null;
}
