import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import anime from "animejs";
import { Sparkles, Rocket, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SplineScene } from "@/components/ui/splite";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

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
    if (hasAnimated.current) {return;}
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
    <section ref={sectionRef} className="relative min-h-screen flex items-center w-full overflow-hidden">
      {/* Scroll-reactive ambient glows */}
      <motion.div
        style={{ scale: glowScale, opacity: glowOpacity }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary blur-[120px] animate-pulse-glow pointer-events-none"
      />
      <motion.div
        style={{ scale: glowScale, opacity: glowOpacity }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary blur-[100px] animate-pulse-glow pointer-events-none"
      />
      <motion.div
        style={{ scale: glowScale }}
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-accent/8 blur-[80px] animate-pulse-glow pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
      />

      {/* 3D Scene Background (Robot) taking full screen but shifted right so it doesn't overlap text */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto translate-x-1/4 lg:translate-x-[30%]">
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </div>

      {/* Orbiting icons as ambient overlay */}
      <div className="absolute top-1/2 left-[75%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] pointer-events-none mix-blend-screen">
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

      {/* Content Overlay overlaid on the left */}
      <motion.div
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 text-left px-6 md:px-12 w-full max-w-7xl mx-auto pointer-events-none"
      >
        <div className="w-full lg:w-[55%] pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-border/50 mb-8 backdrop-blur-md bg-background/30 shadow-xl">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/90 font-body">Welcome to the future of STEM exploration</span>
            </div>
          </motion.div>

          <motion.h1
            ref={titleRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold font-display leading-tight mb-6 tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
          >
            <span className="text-gradient-primary glow-text">STEM Idea</span>
            <br />
            <span className="text-foreground">Adventure</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg sm:text-xl text-foreground max-w-xl mb-12 font-body leading-relaxed drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-medium"
          >
            A platform where curiosity meets innovation. Explore, generate, and bring to life
            creative STEM project ideas in an immersive futuristic experience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="w-full max-w-xl"
          >
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (prompt.trim()) {
                  navigate(`/veronica-ai?prompt=${encodeURIComponent(prompt.trim())}`);
                }
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-start gap-3 w-full"
            >
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a STEM project idea to build..." 
                className="flex-1 px-6 py-4 rounded-xl font-body text-lg bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-md shadow-xl"
              />
              <button 
                type="submit"
                className="btn-glow px-8 py-4 rounded-xl font-display font-semibold text-primary-foreground text-lg w-full sm:w-auto shadow-xl flex items-center justify-center gap-2"
              >
                Try It Now <Sparkles className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none" style={{ opacity: 0 }}>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5 backdrop-blur-sm bg-background/20"
        >
          <div className="w-1.5 h-2.5 rounded-full bg-primary/80" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
