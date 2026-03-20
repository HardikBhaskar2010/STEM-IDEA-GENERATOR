import { } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import ParticleField from "@/components/gateway/ParticleField";
import HeroSection from "@/components/gateway/HeroSection";
import EarthScene from "@/components/gateway/EarthScene";
import FeaturesSection from "@/components/gateway/FeaturesSection";
import ShowcaseSection from "@/components/gateway/ShowcaseSection";
import BenefitsSection from "@/components/gateway/BenefitsSection";
import CTASection from "@/components/gateway/CTASection";


const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left"
      initial={{ background: "linear-gradient(90deg, hsl(265 90% 65%), hsl(220 80% 60%), hsl(330 80% 65%))" }}
      animate={{ background: "linear-gradient(90deg, hsl(265 90% 65%), hsl(220 80% 60%), hsl(330 80% 65%))" }}
    />
  );
};

const SectionDivider = () => (
  <div className="relative h-32 flex items-center justify-center overflow-hidden">
    <div className="w-full max-w-xs h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
  </div>
);

const Welcome = () => {
  return (
    <div className="relative bg-gradient-hero min-h-screen overflow-x-hidden">
      <ScrollProgress />
      <ParticleField />
      <div className="relative z-10">
        <HeroSection />
        <SectionDivider />
        <EarthScene />

        <SectionDivider />
        <FeaturesSection />
        <SectionDivider />
        <ShowcaseSection />
        <SectionDivider />
        <BenefitsSection />
        <SectionDivider />
        <CTASection />
        <footer className="py-8 text-center text-muted-foreground text-sm font-body border-t border-border/50">
          © 2026 STEM Idea Adventure. Explore. Create. Innovate.
        </footer>
      </div>
    </div>
  );
};

export default Welcome;
