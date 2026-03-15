import React, { useEffect, Suspense } from 'react';
import { LeftSidebar } from '@/components/workshop/LeftSidebar';
import { RightPanel } from '@/components/workshop/RightPanel';
import { PlaygroundScene } from '@/components/3D/PlaygroundScene';
import { useCircuitStore } from '@/store/useCircuitStore';
import { EXPERIMENTS, getExperimentById } from '@/lib/experiments';
import { Zap, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Top bar ──────────────────────────────────────────────────────────────────

const TopBar: React.FC = () => {
  const { isSimulating, activeExperimentId, components, connections } = useCircuitStore();
  const experiment = activeExperimentId ? getExperimentById(activeExperimentId) : null;

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-cyan-500/20 bg-black/70 backdrop-blur-md z-10 flex-shrink-0">
      {/* Back button */}
      <Link
        to="/dashboard"
        className="flex items-center gap-1.5 text-gray-500 hover:text-cyan-400 transition-colors text-xs"
      >
        <ChevronLeft size={14} />
        <span>Dashboard</span>
      </Link>

      <div className="w-px h-5 bg-white/10" />

      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
          <Zap size={12} className="text-cyan-400" />
        </div>
        <h1 className="text-white font-bold text-sm tracking-wide">STEM Workshop</h1>
        <span className="text-gray-600 text-xs hidden sm:block">· Arduino Circuit Simulator</span>
      </div>

      {/* Current experiment pill */}
      {experiment && (
        <>
          <div className="w-px h-5 bg-white/10" />
          <div className="hidden md:flex items-center gap-2">
            <span className="text-gray-500 text-xs">Experiment:</span>
            <span className="text-cyan-300 text-xs font-medium">{experiment.title}</span>
          </div>
        </>
      )}

      {/* Status indicators */}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-500">
          <span>{components.length} components</span>
          <span>{connections.length} wires</span>
        </div>

        {/* Simulation status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
            isSimulating
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
            }`}
          />
          {isSimulating ? 'SIMULATING' : 'IDLE'}
        </div>
      </div>
    </header>
  );
};

// ─── Loading fallback for 3D canvas ──────────────────────────────────────────

const SceneLoader: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#020810] to-[#050a18]">
    <div className="text-center">
      <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mx-auto mb-4" />
      <p className="text-cyan-400/60 text-sm font-medium">Loading 3D Workspace...</p>
      <p className="text-gray-600 text-xs mt-1">Initializing Three.js renderer</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const STEMWorkshop: React.FC = () => {
  const { setActiveExperiment } = useCircuitStore();

  // Load the Blink experiment by default on first mount
  useEffect(() => {
    const blinkExp = getExperimentById('blink');
    if (blinkExp) {
      setActiveExperiment('blink', blinkExp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-transparent"
    >
      {/* Top bar */}
      <TopBar />

      {/* Main layout: left sidebar + 3D canvas + right panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 xl:w-72 flex-shrink-0 overflow-hidden hidden md:block">
          <LeftSidebar />
        </aside>

        {/* Center: 3D Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <Suspense fallback={<SceneLoader />}>
            <PlaygroundScene className="w-full h-full" />
          </Suspense>
        </main>

        {/* Right Panel */}
        <aside className="w-72 xl:w-80 flex-shrink-0 overflow-hidden hidden lg:block">
          <RightPanel />
        </aside>
      </div>

      {/* Mobile warning */}
      <div className="md:hidden flex items-center justify-center h-full absolute inset-0 bg-black/90 z-50">
        <div className="text-center p-8">
          <Zap size={40} className="text-cyan-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Desktop Required</h2>
          <p className="text-gray-400 text-sm">
            STEM Workshop is optimized for desktop browsers for the best 3D experience.
          </p>
        </div>
      </div>
    </div>
  );
};

export default STEMWorkshop;
