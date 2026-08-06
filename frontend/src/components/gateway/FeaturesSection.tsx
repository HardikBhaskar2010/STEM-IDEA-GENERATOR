import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import anime from "animejs";
import { Brain, Zap, Compass, Atom, Code, Telescope } from "lucide-react";

const features = [
  { icon: Brain, title: "AI Idea Synthesis", desc: "Generate tailored STEM project concepts based on your interest and skills." },
  { icon: Code, title: "AI Code Generation", desc: "Get full code structures and explanations for your generated project ideas." },
  { icon: Telescope, title: "Learning Library", desc: "Access 20+ interactive chapters covering circuit design, AI, and more." },
  { icon: Atom, title: "Hardware Catalog", desc: "Explore a rich database of 500+ hobbyist components with 3D previews." },
  { icon: Zap, title: "Smart Comparison", desc: "Compare electronic components to find the perfect fit for your projects." },
  { icon: Compass, title: "Global Competition", desc: "Showcase your innovations and compete with makers around the world." },
];

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) {return;}
    hasAnimated.current = true;

    // Staggered card reveal with anime.js
    anime({
      targets: ".feature-card",
      translateY: [60, 0],
      opacity: [0, 1],
      scale: [0.92, 1],
      delay: anime.stagger(100, { start: 300 }),
      duration: 700,
      easing: "easeOutCubic",
    });

    // Icon spin-in animation
    anime({
      targets: ".feature-icon",
      rotateY: [90, 0],
      opacity: [0, 1],
      delay: anime.stagger(100, { start: 500 }),
      duration: 600,
      easing: "easeOutCubic",
    });

    // Animated underline on section heading
    anime({
      targets: ".features-heading-line",
      scaleX: [0, 1],
      delay: 200,
      duration: 800,
      easing: "easeInOutQuart",
    });
  }, [inView]);

  return (
    <section ref={sectionRef} className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            <span className="text-gradient-primary">Explore</span> the Possibilities
          </h2>
          <div className="features-heading-line h-0.5 w-24 mx-auto rounded-full bg-primary/40" style={{ transform: "scaleX(0)" }} />
          <p className="text-muted-foreground text-lg max-w-xl mx-auto font-body mt-4">
            Everything you need to ignite your STEM journey
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="feature-card glass-card-hover p-8 group"
              style={{ opacity: 0 }}
            >
              <div className="feature-icon w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:glow-primary transition-shadow duration-500" style={{ opacity: 0 }}>
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground font-body leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
