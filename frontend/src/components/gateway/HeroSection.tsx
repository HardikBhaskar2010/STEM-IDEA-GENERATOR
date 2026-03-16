import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import anime from "animejs";
import { Sparkles, Rocket, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax transforms driven by scroll
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.9]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.5]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5], [0.1, 0.3]);

  // Anime.js stagger entrance for title characters
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Animate orbiting elements with anime
    anime({
      targets: ".orbit-icon",
      scale: [0, 1],
      opacity: [0, 0.4],
      delay: anime.stagger(200, { start: 1200 }),
      duration: 800,
      easing: "easeOutElastic(1, .6)",
    });

    // Animate the scroll indicator
    anime({
      targets: ".scroll-indicator",
      opacity: [0, 1],
      translateY: [20, 0],
      delay: 2000,
      duration: 800,
      easing: "easeOutCubic",
    });
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Scroll-reactive ambient glows */}
      <motion.div
        style={{ scale: glowScale, opacity: glowOpacity }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary blur-[120px] animate-pulse-glow"
      />
      <motion.div
        style={{ scale: glowScale, opacity: glowOpacity }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary blur-[100px] animate-pulse-glow"
      />
      <motion.div
        style={{ scale: glowScale }}
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-accent/8 blur-[80px] animate-pulse-glow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
      />

      {/* Orbiting icons */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px]">
        <div className="absolute inset-0 animate-orbit orbit-icon" style={{ opacity: 0 }}>
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="absolute inset-0 animate-orbit orbit-icon" style={{ animationDelay: "-7s", opacity: 0 }}>
          <Rocket className="w-5 h-5 text-secondary" />
        </div>
        <div className="absolute inset-0 animate-orbit orbit-icon" style={{ animationDelay: "-14s", opacity: 0 }}>
          <Lightbulb className="w-5 h-5 text-accent" />
        </div>
      </div>

      {/* Content with scroll parallax */}
      <motion.div
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground font-body">Welcome to the future of STEM exploration</span>
          </div>
        </motion.div>

        <motion.h1
          ref={titleRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="text-5xl sm:text-7xl lg:text-8xl font-bold font-display leading-tight mb-6 tracking-tight"
        >
          <span className="text-gradient-primary glow-text">STEM Idea</span>
          <br />
          <span className="text-foreground">Adventure</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 font-body leading-relaxed"
        >
          A platform where curiosity meets innovation. Explore, generate, and bring to life
          creative STEM project ideas in an immersive futuristic experience.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={() => navigate("/dashboard")}
            className="btn-glow px-8 py-4 rounded-xl font-display font-semibold text-primary-foreground text-lg"
          >
            Start Exploring
          </button>
          <button 
            onClick={() => navigate("/generator")}
            className="btn-ghost-glow px-8 py-4 rounded-xl font-display font-semibold text-lg"
          >
            Generate Ideas
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2" style={{ opacity: 0 }}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5"
          >
            <div className="w-1.5 h-2.5 rounded-full bg-primary/60" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
