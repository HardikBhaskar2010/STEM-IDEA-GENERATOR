import { useEffect, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import anime from "animejs";
import { Wand2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ideas = [
  { category: "Veronica", title: "Veronica AI", color: "primary", path: "/veronica-ai" },
  { category: "Veronica", title: "Veronica AI Workspace (Soon)", color: "secondary", path: "/veronica-ai" },
  { category: "Community", title: "Innovation Competition", color: "accent", path: "/competition" },
  { category: "Resources", title: "Hardware Catalog", color: "primary", path: "/components" },
];

const ShowcaseSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });
  const hasAnimated = useRef(false);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgGlowX = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const bgGlowY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);

  useEffect(() => {
    if (!inView || hasAnimated.current) {return;}
    hasAnimated.current = true;

    // Idea cards slide in with stagger
    anime({
      targets: ".idea-card",
      translateX: [80, 0],
      opacity: [0, 1],
      delay: anime.stagger(120, { start: 400 }),
      duration: 700,
      easing: "easeOutCubic",
    });

    // Color bar grows
    anime({
      targets: ".idea-color-bar",
      scaleY: [0, 1],
      delay: anime.stagger(120, { start: 600 }),
      duration: 500,
      easing: "easeOutCubic",
    });

    // Text content slides in
    anime({
      targets: ".showcase-text",
      translateX: [-60, 0],
      opacity: [0, 1],
      duration: 800,
      delay: 200,
      easing: "easeOutCubic",
    });
  }, [inView]);

  return (
    <section ref={sectionRef} className="relative py-32 px-6">
      {/* Parallax background glow */}
      <motion.div
        style={{ x: bgGlowX, y: bgGlowY }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]"
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="showcase-text" style={{ opacity: 0 }}>
            <h2 className="text-4xl sm:text-5xl font-bold font-display mb-6">
              Idea Generation,{" "}
              <span className="text-gradient-primary">Reimagined</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 font-body leading-relaxed">
              Our intelligent engine crafts unique, actionable STEM project ideas
              tailored to your skill level, interests, and available resources.
            </p>
            <button 
              onClick={() => navigate("/veronica-ai")}
              className="btn-glow inline-flex items-center gap-3 px-6 py-3 rounded-xl font-display font-semibold text-primary-foreground"
            >
              <Wand2 className="w-5 h-5" />
              Generate Ideas
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {ideas.map((idea) => (
              <div
                key={idea.title}
                onClick={() => navigate(idea.path)}
                className="idea-card glass-card-hover p-5 flex items-center gap-4 cursor-pointer group"
                style={{ opacity: 0 }}
              >
                <div
                  className={`idea-color-bar w-2 h-12 rounded-full origin-bottom ${
                    idea.color === "primary" ? "bg-primary" : idea.color === "secondary" ? "bg-secondary" : "bg-accent"
                  }`}
                  style={{ transform: "scaleY(0)" }}
                />
                <div className="flex-1">
                  <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">{idea.category}</span>
                  <h4 className="font-display font-semibold text-foreground">{idea.title}</h4>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowcaseSection;
