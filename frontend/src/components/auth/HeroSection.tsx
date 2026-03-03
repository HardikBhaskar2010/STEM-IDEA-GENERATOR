import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, Rocket } from 'lucide-react';

const HeroSection: React.FC = () => {
  const features = [
    { icon: Globe, text: 'Global Online Platform' },
    { icon: Users, text: 'Daily STEM Challenges' },
    { icon: Rocket, text: 'Build • Learn • Compete' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="flex flex-col justify-center space-y-8 px-8 lg:px-16"
    >
      {/* Incoming Transmission Label */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="flex items-center space-x-2"
      >
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-orange-500 text-sm font-medium tracking-wider uppercase">
          Incoming Transmission
        </span>
      </motion.div>

      {/* Main Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="space-y-2"
      >
        <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
          STEM Idea Adventure
        </h1>
        <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
          starts here
        </h2>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-gray-300 text-lg leading-relaxed max-w-xl"
      >
        We're building a universe where young innovators turn ideas into real-world projects.
        Join the platform, explore challenges, and start creating the future.
      </motion.p>

      {/* Features List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="space-y-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
            className="flex items-center space-x-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:border-purple-500/50 transition-all duration-300">
              <feature.icon className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-gray-200 text-lg font-medium">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default HeroSection;