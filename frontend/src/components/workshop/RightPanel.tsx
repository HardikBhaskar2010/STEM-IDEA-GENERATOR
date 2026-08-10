import React, { useState } from 'react';
import { useCircuitStore } from '@/store/useCircuitStore';
import { getExperimentById } from '@/lib/experiments';
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
  Info,
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

// CircuitDiagram removed — the main SchematicCanvas IS the diagram.

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

        <div className="flex gap-2">
          {/* Reset */}
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-gray-400 border border-white/10 bg-white/3 hover:bg-white/8 hover:text-gray-200 transition-all"
            onClick={() => {
              stopSimulation();
              if (activeExperimentId) {
                const exp = getExperimentById(activeExperimentId);
                if (exp) {useCircuitStore.getState().setActiveExperiment(activeExperimentId, exp);}
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
