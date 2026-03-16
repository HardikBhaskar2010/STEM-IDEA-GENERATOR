import { useEffect, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import anime from "animejs";
import { Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });
  const hasAnimated = useRef(false);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const glowScale = useTransform(scrollYProgress, [0, 0.5], [0.5, 1.2]);
  const cardY = useTransform(scrollYProgress, [0.1, 0.5], [60, 0]);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    anime({
      targets: ".cta-card",
      translateY: [80, 0],
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 900,
      easing: "easeOutCubic",
    });

    anime({
      targets: ".cta-rocket",
      translateY: [-30, 0],
      opacity: [0, 1],
      rotate: ["-15deg", "0deg"],
      duration: 800,
      delay: 400,
      easing: "easeOutElastic(1, .6)",
    });

    anime({
      targets: ".cta-btn",
      scale: [0.8, 1],
      opacity: [0, 1],
      delay: 700,
      duration: 600,
      easing: "easeOutCubic",
    });
  }, [inView]);

  return (
    <section ref={sectionRef} className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <motion.div
        style={{ scale: glowScale }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px]"
      />

      <motion.div style={{ y: cardY }} className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="cta-card glass-card p-12 sm:p-16" style={{ opacity: 0 }}>
          <div className="cta-rocket" style={{ opacity: 0 }}>
            <Rocket className="w-10 h-10 text-primary mx-auto mb-6 animate-float" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            Ready to Begin Your{" "}
            <span className="text-gradient-primary">STEM Journey</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 font-body max-w-lg mx-auto">
            Join thousands of makers and explorers. Create your account today and start building the future.
          </p>
          <div className="cta-btn" style={{ opacity: 0 }}>
            <button 
              onClick={() => navigate("/signup")}
              className="btn-glow px-10 py-4 rounded-xl font-display font-semibold text-primary-foreground text-lg inline-flex items-center gap-3"
            >
              <Rocket className="w-5 h-5" />
              Get Started for Free
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
