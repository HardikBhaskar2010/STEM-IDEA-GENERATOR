import React from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      className="w-full max-w-md mx-auto"
    >
      <div 
        className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        style={{
          boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), 0 0 100px rgba(139, 92, 246, 0.1)',
        }}
      >
        {/* Top glow effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
        
        {/* Card content */}
        <div className="relative z-10 p-8">
          {children}
        </div>
        
        {/* Bottom glow effect */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-30" />
      </div>
    </motion.div>
  );
};

export default AuthCard;