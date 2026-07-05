import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import { LandingNavbar } from "@/features/landing/components/LandingNavbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeatureSection } from "@/features/landing/components/FeatureSection";
import { RolesSection } from "@/features/landing/components/RolesSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection";
import { FutureGrowthSection } from "@/features/landing/components/FutureGrowthSection";
import { TestimonialsSection } from "@/features/landing/components/TestimonialsSection";
import { OnboardingSection } from "@/features/landing/components/OnboardingSection";
import { QASection } from "@/features/landing/components/QASection";
import { Footer } from "@/features/landing/components/Footer";

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-primary"
    />
  );
}

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen w-full overflow-x-clip bg-background dark:bg-[#030303] font-sans text-foreground antialiased selection:bg-primary/20">
        <ScrollProgressBar />
        <LandingNavbar />
        <main>
          <HeroSection />
          <FeatureSection />
          <RolesSection />
          <HowItWorksSection />
          <FutureGrowthSection />
          <TestimonialsSection />
          <OnboardingSection />
          <QASection />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
