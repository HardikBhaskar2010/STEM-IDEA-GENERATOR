import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import anime from "animejs";

const stats = [
  { value: 500, suffix: "+", label: "Project Ideas" },
  { value: 12, suffix: "", label: "STEM Domains" },
  { value: null, display: "∞", label: "Possibilities" },
  { value: null, display: "24/7", label: "AI Assistance" },
];

const BenefitsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });
  const hasAnimated = useRef(false);
  const [counts, setCounts] = useState<string[]>(stats.map(() => "0"));

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const cardY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -20]);

  useEffect(() => {
    if (!inView || hasAnimated.current) {return;}
    hasAnimated.current = true;

    // Card entrance
    anime({
      targets: ".stat-card",
      translateY: [50, 0],
      opacity: [0, 1],
      scale: [0.85, 1],
      delay: anime.stagger(100, { start: 200 }),
      duration: 700,
      easing: "easeOutCubic",
    });

    // Count-up animation for numeric stats
    stats.forEach((stat, i) => {
      if (stat.value !== null) {
        const obj = { val: 0 };
        anime({
          targets: obj,
          val: stat.value,
          round: 1,
          duration: 1500,
          delay: 400 + i * 150,
          easing: "easeOutExpo",
          update: () => {
            setCounts((prev) => {
              const next = [...prev];
              next[i] = `${obj.val}${stat.suffix}`;
              return next;
            });
          },
        });
      } else {
        // For non-numeric, just reveal
        setTimeout(() => {
          setCounts((prev) => {
            const next = [...prev];
            next[i] = stat.display!;
            return next;
          });
        }, 600 + i * 150);
      }
    });

    // Heading reveal
    anime({
      targets: ".benefits-heading",
      translateY: [40, 0],
      opacity: [0, 1],
      duration: 800,
      easing: "easeOutCubic",
    });
  }, [inView]);

  return (
    <section ref={sectionRef} className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="benefits-heading text-center mb-16" style={{ opacity: 0 }}>
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            Why <span className="text-gradient-primary">Adventurers</span> Love It
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto font-body">
            Join thousands of curious minds pushing the boundaries of STEM
          </p>
        </div>

        <motion.div style={{ y: cardY }} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="stat-card glass-card p-8 text-center"
              style={{ opacity: 0 }}
            >
              <div className="text-4xl sm:text-5xl font-bold font-display text-gradient-primary mb-2">
                {counts[i]}
              </div>
              <div className="text-muted-foreground font-body text-sm uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
