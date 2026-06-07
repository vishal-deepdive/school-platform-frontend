import { LandingNavbar } from "@/components/landing/LandingNavbar"
import { HeroSection } from "@/components/landing/HeroSection"
import { FeatureSection } from "@/components/landing/FeatureSection"
import { FutureGrowthSection } from "@/components/landing/FutureGrowthSection"
import { OnboardingSection } from "@/components/landing/OnboardingSection"
import { QASection } from "@/components/landing/QASection"
import { Footer } from "@/components/landing/Footer"

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
  )
}
