import React from 'react';
import { Home } from 'lucide-react';
import { useNavigate } from '@/lib/navigation';

const Presentation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      data-testid="presentation-container"
    >
      {/* Home Button - Fixed */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg"
        data-testid="home-button"
        aria-label="Go to home"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* Fullscreen Iframe */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          src="https://gamma.app/embed/xh3mo6lxv2cvjyq"
          title="STEM Project Generator"
          data-testid="presentation-iframe"
          allowFullScreen
          className="w-full h-full border-0"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
};

export default Presentation;
