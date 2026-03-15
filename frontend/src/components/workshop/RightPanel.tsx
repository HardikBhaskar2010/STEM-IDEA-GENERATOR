import React, { useState } from 'react';
import { useCircuitStore } from '@/store/useCircuitStore';
import { EXPERIMENTS, getExperimentById } from '@/lib/experiments';
import {
  Play,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  BookOpen,
  Code2,
  GitBranch,
  Info,
  Target,
} from 'lucide-react';

// ─── Syntax highlight (minimal) ──────────────────────────────────────────────

function highlightArduino(code: string): React.ReactNode {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    // Very minimal keyword coloring via span
    const colorized = line
      .replace(/(\/\/.*)/g, '<span class="text-gray-500 italic">$1</span>')
      .replace(
        /\b(void|int|const|bool|float|char|byte|long|unsigned|if|else|for|while|return|true|false|HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|#include)\b/g,
        '<span class="text-purple-400 font-semibold">$1</span>'
      )
      .replace(
        /\b(pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|Serial|tone|noTone|millis|map|constrain|setup|loop|write|attach|println|begin)\b/g,
        '<span class="text-cyan-300">$1</span>'
      )
      .replace(/(\d+)/g, '<span class="text-orange-300">$1</span>');

    return (
      <div key={i} className="flex">
        <span className="text-gray-600 select-none w-7 text-right mr-3 flex-shrink-0 text-[10px] leading-5">
          {i + 1}
        </span>
        <span
          className="text-gray-200 text-[11px] leading-5 font-mono break-all"
          dangerouslySetInnerHTML={{ __html: colorized }}
        />
      </div>
    );
  });
}

// ─── Circuit Diagram (simple SVG) ────────────────────────────────────────────

function CircuitDiagram({ expId }: { expId: string }) {
  // Minimal SVG diagrams per experiment
  const diagrams: Record<string, React.ReactNode> = {
    blink: (
      <svg viewBox="0 0 200 120" className="w-full h-32 text-cyan-400">
        {/* Arduino */}
        <rect x="10" y="40" width="60" height="40" fill="#1a6b1a" rx="3" />
        <text x="40" y="65" textAnchor="middle" fill="#86efac" fontSize="8">Arduino</text>
        {/* Wire from D13 */}
        <line x1="70" y1="55" x2="100" y2="55" stroke="#00e5ff" strokeWidth="1.5" />
        {/* Resistor */}
        <rect x="100" y="50" width="25" height="10" fill="none" stroke="#c8a050" strokeWidth="1.5" rx="2" />
        <text x="112" y="70" textAnchor="middle" fill="#c8a050" fontSize="7">220Ω</text>
        {/* LED */}
        <polygon points="125,50 125,60 140,55" fill="#ff3333" stroke="#ff3333" strokeWidth="1" />
        <line x1="140" y1="50" x2="140" y2="60" stroke="#ff3333" strokeWidth="2" />
        {/* Wire to GND */}
        <line x1="140" y1="55" x2="170" y2="55" stroke="#4444ff" strokeWidth="1.5" />
        <text x="170" y="59" fill="#aaaaff" fontSize="7">GND</text>
        <text x="70" y="52" fill="#00e5ff" fontSize="7">D13</text>
      </svg>
    ),
    'button-toggle': (
      <svg viewBox="0 0 220 120" className="w-full h-32">
        <rect x="10" y="30" width="60" height="60" fill="#1a6b1a" rx="3" />
        <text x="40" y="65" textAnchor="middle" fill="#86efac" fontSize="8">Arduino</text>
        {/* Button */}
        <circle cx="110" cy="50" r="12" fill="none" stroke="#cc3333" strokeWidth="1.5" />
        <line x1="104" y1="60" x2="104" y2="70" stroke="#c8a050" strokeWidth="1.2" />
        <line x1="116" y1="60" x2="116" y2="70" stroke="#c8a050" strokeWidth="1.2" />
        <text x="110" y="87" textAnchor="middle" fill="#cc3333" fontSize="7">BTN</text>
        {/* LED */}
        <polygon points="155,40 155,60 175,50" fill="#33ff77" stroke="#33ff77" strokeWidth="1" />
        <line x1="175" y1="40" x2="175" y2="60" stroke="#33ff77" strokeWidth="2" />
        <text x="160" y="75" fill="#33ff77" fontSize="7">LED</text>
        {/* Wires */}
        <line x1="70" y1="60" x2="98" y2="50" stroke="#ff4444" strokeWidth="1.5" />
        <line x1="122" y1="50" x2="140" y2="50" stroke="#00e5ff" strokeWidth="1.5" />
        <line x1="175" y1="50" x2="200" y2="50" stroke="#4444ff" strokeWidth="1.5" />
        <text x="200" y="54" fill="#aaaaff" fontSize="7">GND</text>
      </svg>
    ),
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
      <div className="text-gray-400 text-[10px] font-medium mb-2 flex items-center gap-1">
        <GitBranch size={10} />
        CIRCUIT DIAGRAM
      </div>
      {diagrams[expId] ?? (
        <div className="text-gray-600 text-xs text-center py-4">
          Select an experiment to view diagram
        </div>
      )}
    </div>
  );
}

// ─── RightPanel ───────────────────────────────────────────────────────────────

export const RightPanel: React.FC = () => {
  const {
    activeExperimentId,
    startSimulation,
    stopSimulation,
    isSimulating,
    resetWorkspace,
    clearConnections,
    clearComponents,
    components,
    connections,
    calibrationMode,
    setCalibrationMode,
    selectedComponentId,
  } = useCircuitStore();

  const [codeCopied, setCodeCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('info');

  const experiment = activeExperimentId ? getExperimentById(activeExperimentId) : null;

  const handleCopyCode = () => {
    if (experiment?.code) {
      navigator.clipboard.writeText(experiment.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const Section = ({
    id,
    icon,
    title,
    children,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="border-b border-white/5">
      <button
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-white/3 transition-colors"
        onClick={() => toggleSection(id)}
      >
        <span className="text-cyan-400/70">{icon}</span>
        <span className="text-gray-300 text-xs font-medium tracking-wide flex-1">{title}</span>
        {expandedSection === id ? (
          <ChevronDown size={12} className="text-gray-500" />
        ) : (
          <ChevronRight size={12} className="text-gray-500" />
        )}
      </button>
      {expandedSection === id && <div className="px-3 pb-3">{children}</div>}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-black/60 backdrop-blur-md border-l border-cyan-500/20">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-cyan-400" />
          <h2 className="text-cyan-300 font-bold text-sm tracking-widest uppercase">
            {experiment ? experiment.title : 'Control Panel'}
          </h2>
        </div>
        {experiment && (
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                experiment.difficulty === 'Beginner'
                  ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                  : experiment.difficulty === 'Intermediate'
                  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                  : 'bg-red-400/10 text-red-400 border border-red-400/20'
              }`}
            >
              {experiment.difficulty}
            </span>
            <span className="text-gray-600 text-[10px]">
              {components.length} components · {connections.length} wires
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {experiment ? (
          <>
            {/* Info */}
            <Section id="info" icon={<Info size={12} />} title="ABOUT">
              <p className="text-gray-400 text-xs leading-relaxed">{experiment.description}</p>
            </Section>

            {/* Instructions */}
            <Section id="instructions" icon={<BookOpen size={12} />} title="BUILD INSTRUCTIONS">
              <ol className="space-y-2">
                {experiment.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-gray-300 text-xs leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </Section>

            {/* Circuit Diagram */}
            <Section id="diagram" icon={<GitBranch size={12} />} title="CIRCUIT DIAGRAM">
              <CircuitDiagram expId={experiment.id} />
            </Section>

            {/* Code */}
            <Section id="code" icon={<Code2 size={12} />} title="ARDUINO CODE">
              <div className="relative">
                <button
                  className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/20 transition-colors"
                  onClick={handleCopyCode}
                >
                  {codeCopied ? <Check size={10} /> : <Copy size={10} />}
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
                <div className="bg-gray-950/80 rounded-lg p-3 pt-4 border border-white/5 overflow-x-auto">
                  <div className="font-mono text-[11px] leading-5 space-y-0">
                    {highlightArduino(experiment.code)}
                  </div>
                </div>
              </div>
            </Section>

            {/* Calibrated Pins for the selected component type */}
            {selectedComponentId && (
              <Section id="calibration" icon={<Target size={12} />} title="CALIBRATED PINS">
                <div className="space-y-2">
                  {(() => {
                    const comp = components.find(c => c.id === selectedComponentId);
                    if (!comp) return <p className="text-gray-500 text-[10px]">No component selected</p>;
                    const pins = useCircuitStore.getState().userPins[comp.type] || [];
                    if (pins.length === 0) return <p className="text-gray-500 text-[10px]">No custom pins placed yet.</p>;
                    return pins.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 group">
                        <div className="flex flex-col">
                          <span className="text-cyan-400 text-[10px] font-bold">{p.label}</span>
                          <span className="text-gray-500 text-[9px] font-mono">
                            [{p.relativePosition[0].toFixed(3)}, {p.relativePosition[1].toFixed(3)}, {p.relativePosition[2].toFixed(3)}]
                          </span>
                        </div>
                        <button 
                          onClick={() => useCircuitStore.getState().removeUserPin(comp.type, p.id)}
                          className="text-red-400/40 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </Section>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-400/5 border border-cyan-400/10 flex items-center justify-center mb-4">
              <Zap size={24} className="text-cyan-400/40" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No experiment selected</p>
            <p className="text-gray-600 text-xs mt-1">
              Choose an experiment from the left panel to get started
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-cyan-500/20 space-y-2">
        {/* Simulate / Stop */}
        <button
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
            isSimulating
              ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
              : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30'
          }`}
          onClick={isSimulating ? stopSimulation : startSimulation}
          disabled={!experiment}
        >
          <Play size={14} className={isSimulating ? 'animate-pulse' : ''} />
          {isSimulating ? 'Stop Simulation' : 'Run Simulation'}
        </button>

        {/* Pin Calibration Mode Toggle */}
        <button
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-xs transition-all ${
            calibrationMode
              ? 'bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
          }`}
          onClick={() => setCalibrationMode(!calibrationMode)}
        >
          <Target size={14} className={calibrationMode ? 'animate-pulse text-pink-400' : ''} />
          {calibrationMode ? 'Exit Calibration Mode' : 'Add Custom Pin'}
        </button>

        <div className="flex gap-2">
          {/* Reset */}
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-gray-400 border border-white/10 bg-white/3 hover:bg-white/8 hover:text-gray-200 transition-all"
            onClick={() => {
              stopSimulation();
              if (activeExperimentId) {
                const exp = getExperimentById(activeExperimentId);
                if (exp) useCircuitStore.getState().setActiveExperiment(activeExperimentId, exp);
              }
            }}
          >
            <RotateCcw size={12} />
            Reset
          </button>

          {/* Clear */}
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-red-400/60 border border-red-500/10 bg-red-500/3 hover:bg-red-500/10 hover:text-red-400 transition-all"
            onClick={resetWorkspace}
          >
            <Trash2 size={12} />
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
