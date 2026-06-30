"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

import { Footer } from "@/components/sections/footer";
import { HeroAside } from "@/components/sections/hero-aside";
import { AboutSection } from "@/components/yash-components/about-section";
import { IntegrationsSection } from "@/components/yash-components/integrations-section";
import { FeaturesSection } from "@/components/yash-components/features-section";
import { SecuritySection } from "@/components/yash-components/security-section";
import { HowItWorksSection } from "@/components/yash-components/how-it-works-section";
import { PricingSection } from "@/components/yash-components/pricing-section";
import { CtaSection } from "@/components/yash-components/cta-section";
import { FaqSection } from "@/components/yash-components/faq-section";

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
      <HowItWorksSection />
      <FeaturesSection />
      <SecuritySection />

      <PricingSection />

      <CtaSection />

      <Footer />
    </div>
  );
}
