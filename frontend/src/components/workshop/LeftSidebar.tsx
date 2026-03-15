import React, { useState } from 'react';
import { EXPERIMENTS } from '@/lib/experiments';
import { useCircuitStore, ComponentType, PlacedComponent } from '@/store/useCircuitStore';
import {
  Cpu,
  Zap,
  Circle,
  ToggleLeft,
  Sliders,
  Volume2,
  Cog,
  Sun,
  Minus,
  ChevronDown,
  Layers,
  FlaskConical,
} from 'lucide-react';

// ─── Component library items ──────────────────────────────────────────────────

interface LibraryItem {
  type: ComponentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultProps: Partial<PlacedComponent>;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    type: 'arduino',
    label: 'Arduino Uno',
    description: 'Microcontroller board',
    icon: <Cpu size={16} />,
    color: '#1a6b1a',
    defaultProps: {},
  },
  {
    type: 'breadboard',
    label: 'Breadboard',
    description: '400-point breadboard',
    icon: <Layers size={16} />,
    color: '#c8b870',
    defaultProps: {},
  },
  {
    type: 'led',
    label: 'LED',
    description: 'Light emitting diode',
    icon: <Circle size={16} />,
    color: '#ff3333',
    defaultProps: { isOn: false, brightness: 0, color: '#ff3333' },
  },
  {
    type: 'resistor',
    label: 'Resistor',
    description: '220Ω resistor',
    icon: <Minus size={16} />,
    color: '#c8a050',
    defaultProps: {},
  },
  {
    type: 'button',
    label: 'Push Button',
    description: 'Momentary switch',
    icon: <ToggleLeft size={16} />,
    color: '#cc3333',
    defaultProps: { buttonState: false },
  },
  {
    type: 'potentiometer',
    label: 'Potentiometer',
    description: 'Rotary knob (0-1023)',
    icon: <Sliders size={16} />,
    color: '#4444aa',
    defaultProps: { potValue: 512 },
  },
  {
    type: 'buzzer',
    label: 'Buzzer',
    description: 'Passive piezo buzzer',
    icon: <Volume2 size={16} />,
    color: '#333333',
    defaultProps: { isOn: false, buzzFreq: 440 },
  },
  {
    type: 'servo',
    label: 'Servo Motor',
    description: '180° hobby servo',
    icon: <Cog size={16} />,
    color: '#2244aa',
    defaultProps: { servoAngle: 90 },
  },
  {
    type: 'ldr',
    label: 'LDR Sensor',
    description: 'Light dependent resistor',
    icon: <Sun size={16} />,
    color: '#aa8800',
    defaultProps: { ldrValue: 512 },
  },
];

// ─── Counter for unique IDs ───────────────────────────────────────────────────
let _idCounter = 100;
function genId(type: string) { return `${type}-${++_idCounter}`; }

// ─── LeftSidebar ─────────────────────────────────────────────────────────────

export const LeftSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'experiments' | 'library'>('experiments');
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const { setActiveExperiment, addComponent, activeExperimentId } = useCircuitStore();

  const handleSelectExperiment = (expId: string) => {
    const exp = EXPERIMENTS.find((e) => e.id === expId);
    if (exp) {
      setActiveExperiment(expId, exp);
    }
    setExpandedExp(expandedExp === expId ? null : expId);
  };

  const handleAddComponent = (item: LibraryItem) => {
    const spread = (Math.random() - 0.5) * 4;
    const newComp: PlacedComponent = {
      id: genId(item.type),
      type: item.type,
      label: item.label,
      position: [spread, 0, spread],
      rotation: [0, 0, 0],
      ...item.defaultProps,
    };
    addComponent(newComp);
  };

  const difficultyColor = (d: string) => {
    if (d === 'Beginner') return 'text-green-400';
    if (d === 'Intermediate') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="h-full flex flex-col bg-black/60 backdrop-blur-md border-r border-cyan-500/20">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <h2 className="text-cyan-300 font-bold text-sm tracking-widest uppercase flex items-center gap-2">
          <Zap size={14} className="text-cyan-400" />
          STEM Workshop
        </h2>
        <p className="text-gray-500 text-xs mt-1">Arduino Circuit Simulator</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-500/10">
        <button
          className={`flex-1 py-2 text-xs font-medium tracking-wider transition-colors ${
            activeTab === 'experiments'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('experiments')}
        >
          <FlaskConical size={12} className="inline mr-1" />
          Experiments
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium tracking-wider transition-colors ${
            activeTab === 'library'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('library')}
        >
          <Layers size={12} className="inline mr-1" />
          Library
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {activeTab === 'experiments' ? (
          <div className="space-y-1">
            {EXPERIMENTS.map((exp) => (
              <div
                key={exp.id}
                className={`rounded-lg border transition-all cursor-pointer ${
                  activeExperimentId === exp.id
                    ? 'border-cyan-400/60 bg-cyan-400/10'
                    : 'border-white/5 bg-white/3 hover:border-cyan-400/30 hover:bg-white/5'
                }`}
              >
                <button
                  className="w-full text-left p-3"
                  onClick={() => handleSelectExperiment(exp.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-medium">{exp.title}</span>
                    <span className={`text-[10px] font-medium ${difficultyColor(exp.difficulty)}`}>
                      {exp.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-0.5 leading-tight line-clamp-2">
                    {exp.description}
                  </p>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-gray-600 text-[10px] px-1 py-1">
              Click any component to add it to the workspace
            </p>
            {LIBRARY_ITEMS.map((item) => (
              <button
                key={item.type}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-white/3 
                           hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all text-left group"
                onClick={() => handleAddComponent(item)}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}22`, color: item.color, border: `1px solid ${item.color}44` }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium group-hover:text-cyan-300 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-gray-500 text-[10px]">{item.description}</div>
                </div>
                <div className="ml-auto text-cyan-400/30 group-hover:text-cyan-400/70 transition-colors text-xs">
                  +
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
