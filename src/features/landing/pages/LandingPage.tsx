import { LandingNavbar } from "@/features/landing/components/LandingNavbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeatureSection } from "@/features/landing/components/FeatureSection";
import { FutureGrowthSection } from "@/features/landing/components/FutureGrowthSection";
import { OnboardingSection } from "@/features/landing/components/OnboardingSection";
import { QASection } from "@/features/landing/components/QASection";
import { Footer } from "@/features/landing/components/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#F3F5F7] font-sans selection:bg-primary/30">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <FutureGrowthSection />
        <OnboardingSection />
        <QASection />
      </main>
      <Footer />
    </div>
  );
}
