import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import { LandingNavbar } from "@/features/landing/components/LandingNavbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeatureSection } from "@/features/landing/components/FeatureSection";
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
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-primary via-sky-400 to-cyan-400"
    />
  );
}

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen w-full overflow-x-clip bg-background font-sans text-foreground antialiased selection:bg-primary/20">
        <ScrollProgressBar />
        <LandingNavbar />
        <main>
          <HeroSection />
          <FeatureSection />
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
