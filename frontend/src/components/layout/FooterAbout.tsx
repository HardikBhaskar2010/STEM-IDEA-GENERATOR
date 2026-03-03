import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, Sparkles } from 'lucide-react';

const FooterAbout: React.FC = () => {
  return (
    <footer className="border-t border-border/60 bg-background/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-6 md:grid-cols-[1.5fr,1fr] items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Note From Creator</p>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Hi, I'm Hardik Bhaskar — Student, React & Python enthusiast, and Game Developer
            </h3>
            <p className="text-muted-foreground max-w-3xl">
              I love building creative solutions — from web apps to fun games. Featured projects include the ATAL Idea Generator, Calcu, Streamit, and more. Always learning, always shipping.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link to="/about">
              <Button size="lg" className="bg-gradient-primary text-white shadow-glow" ripple>
                <Sparkles className="mr-2 w-4 h-4" /> Learn more
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterAbout;
