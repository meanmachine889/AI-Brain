"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { ArrowRight } from "lucide-react";

import { Pricing } from "@/components/sections/pricing";
import { Footer } from "@/components/sections/footer";
import { HeroAside } from "@/components/sections/hero-aside";
import { AboutSection } from "@/components/yash-components/about-section";
import { IntegrationsSection } from "@/components/yash-components/integrations-section";
import { FeaturesSection } from "@/components/yash-components/features-section";
import { SecuritySection } from "@/components/yash-components/security-section";
import { TeamsSection } from "@/components/yash-components/teams-section";

// The original (pre-yash-components) landing sections live in
// components/sections/legacy-landing.tsx and are no longer rendered here.

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-mono">
            Connecting Core
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <HeroAside />

      <AboutSection />

      <IntegrationsSection />
      <FeaturesSection />
      <TeamsSection />
      <SecuritySection />

      <Pricing />

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="border-t border-border/40 bg-foreground py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-background sm:text-4xl mb-4">
            Stop prepping. Start knowing.
          </h2>
          <p className="text-sm text-background/60 max-w-md mx-auto mb-8">
            Join agency teams who&apos;ve eliminated pre-call context gathering completely.
          </p>
          <Link
            href="/login"
            className="group inline-flex h-11 items-center gap-2 rounded-xl bg-background px-8 text-sm font-semibold text-foreground shadow-depth hover:bg-background/90 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150"
          >
            Get started free
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
