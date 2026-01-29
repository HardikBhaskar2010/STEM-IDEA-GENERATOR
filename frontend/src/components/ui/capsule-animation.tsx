import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Sparkles, Zap } from 'lucide-react';

interface CapsuleAnimationProps {
  isOpen: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
}

export const CapsuleAnimation: React.FC<CapsuleAnimationProps> = ({ isOpen, onComplete, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sparklesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timeline = anime.timeline({
        easing: 'easeOutExpo',
        complete: onComplete
      });

      timeline
        .add({
          targets: sparklesRef.current,
          scale: [0, 1.5, 0],
          opacity: [0, 1, 0],
          duration: 1000,
          easing: 'easeOutElastic(1, .8)'
        })
        .add({
          targets: topRef.current,
          translateY: '-100%',
          rotate: '-10deg',
          opacity: 0,
          duration: 800,
        }, '-=400')
        .add({
          targets: bottomRef.current,
          translateY: '100%',
          rotate: '10deg',
          opacity: 0,
          duration: 800,
        }, '-=800')
        .add({
          targets: contentRef.current,
          scale: [0.8, 1],
          opacity: [0, 1],
          duration: 1000,
          easing: 'easeOutElastic(1, .5)'
        }, '-=600');
    }
  }, [isOpen, onComplete]);

  if (!isOpen) {
    return (
      <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden rounded-3xl bg-muted/20 border-2 border-dashed border-primary/20 group">
        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto shadow-xl group-hover:scale-110 transition-transform duration-500">
            <Zap className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <p className="text-xl font-black text-gradient uppercase tracking-widest">Awaiting Synthesis</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full min-h-[500px] flex items-center justify-center">
      {/* Sparkles Layer */}
      <div ref={sparklesRef} className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
        <Sparkles className="w-32 h-32 text-primary" />
      </div>

      {/* The Capsule Parts (Visual only for animation transition) */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div ref={topRef} className="absolute top-0 left-0 w-full h-1/2 bg-gradient-primary rounded-t-3xl border-b-2 border-white/20 shadow-2xl" />
        <div ref={bottomRef} className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-primary rounded-b-3xl border-t-2 border-white/20 shadow-2xl" />
      </div>

      {/* The Real Content */}
      <div ref={contentRef} className="w-full h-full opacity-0 scale-90">
        {children}
      </div>
    </div>
  );
};
