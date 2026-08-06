import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComponentType =
  | 'arduino'
  | 'breadboard'
  | 'led'
  | 'resistor'
  | 'button'
  | 'potentiometer'
  | 'buzzer'
  | 'servo'
  | 'ldr';

export interface PinState {
  id: string;       // e.g. "arduino-13", "breadboard-A1", "led-0-anode"
  componentId: string;
  label: string;
  isInput: boolean;
  worldPosition: [number, number, number];
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
  // Simulation specific state
  isOn?: boolean;          // LED on/off
  brightness?: number;     // LED brightness 0-1
  color?: string;          // LED color
  buttonState?: boolean;   // Button pressed
  potValue?: number;       // 0-1023
  ldrValue?: number;       // 0-1023 (light level)
  servoAngle?: number;     // 0-180
  buzzFreq?: number;       // buzzer frequency hz
}

export interface Connection {
  id: string;
  from: string; // PinID
  to: string;   // PinID
  isLive: boolean;
}

export interface ExperimentDef {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  components: PlacedComponent[];
  connections: Connection[];
  code: string;
  instructions: string[];
  diagramSvg?: string;
}

export interface UserPin {
  id: string;
  componentId: string;
  label: string;
  // Position is relative to the *component's center*, making it reusable for instances
  relativePosition: [number, number, number];
}

interface CircuitStore {
  // ── Placed components ───
  components: PlacedComponent[];
  addComponent: (comp: PlacedComponent) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, patch: Partial<PlacedComponent>) => void;
  clearComponents: () => void;

  // ── Pin states ───
  pins: Record<string, PinState>;
  registerPin: (pin: PinState) => void;
  setActivePinId: (pinId: string | null) => void;
  activePinId: string | null;

  // ── Connections / wires ───
  connections: Connection[];
  addConnection: (conn: Connection) => void;
  removeConnection: (id: string) => void;
  clearConnections: () => void;

  // ── Simulation ───
  isPowered: boolean;
  isSimulating: boolean;
  setPowered: (v: boolean) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  simulationTick: () => void;
  simInterval: ReturnType<typeof setInterval> | null;

  // ── Experiment selection ───
  activeExperimentId: string | null;
  setActiveExperiment: (id: string, def: ExperimentDef) => void;
  resetWorkspace: () => void;

  // ── Selected component (right panel / inspect) ───
  selectedComponentId: string | null;
  setSelectedComponentId: (id: string | null) => void;

  // ── Wire in progress ───
  wireStartPinId: string | null;
  setWireStartPin: (pinId: string | null) => void;
  connectPins: (from: string, to: string) => void;

  // ── Pin Calibration Mode ───
  calibrationMode: boolean;
  setCalibrationMode: (active: boolean) => void;
  userPins: Record<string, UserPin[]>; // Map of component type -> user pinned offsets
  addUserPin: (componentType: string, pin: UserPin) => void;
  removeUserPin: (componentType: string, pinId: string) => void;

  // ── Transform Mode (AutoCAD Style) ───
  transformMode: 'translate' | 'rotate' | 'scale' | null;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale' | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _connIdCounter = 0;
function genConnId() { return `conn-${++_connIdCounter}`; }

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  // ── Components ──
  components: [],
  addComponent: (comp) =>
    set((s) => ({ components: [...s.components, comp] })),
  removeComponent: (id) =>
    set((s) => ({
      components: s.components.filter((c) => c.id !== id),
      connections: s.connections.filter(
        (c) => {
          const pin1 = s.pins[c.from];
          const pin2 = s.pins[c.to];
          return pin1?.componentId !== id && pin2?.componentId !== id;
        }
      ),
    })),
  updateComponent: (id, patch) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  clearComponents: () => set({ components: [], pins: {} }),

  // ── Pins ──
  pins: {},
  activePinId: null,
  registerPin: (pin) =>
    set((s) => ({ pins: { ...s.pins, [pin.id]: pin } })),
  setActivePinId: (pinId) => set({ activePinId: pinId }),

  // ── Connections ──
  connections: [],
  addConnection: (conn) =>
    set((s) => ({ connections: [...s.connections, conn] })),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
  clearConnections: () => set({ connections: [] }),
  connectPins: (from, to) =>
    set((s) => {
      if (from === to) {return s;}
      const exists = s.connections.some(
        (c) => (c.from === from && c.to === to) || (c.from === to && c.to === from)
      );
      if (exists) {return s;}
      return {
        connections: [
          ...s.connections,
          { id: genConnId(), from, to, isLive: false },
        ],
      };
    }),

  // ── Simulation ──
  isPowered: false,
  isSimulating: false,
  simInterval: null,
  setPowered: (v) => set({ isPowered: v }),

  startSimulation: () => {
    const { isSimulating, simulationTick } = get();
    if (isSimulating) {return;}
    const interval = setInterval(simulationTick, 100);
    set({ isSimulating: true, isPowered: true, simInterval: interval });
  },

  stopSimulation: () => {
    const { simInterval } = get();
    if (simInterval) {clearInterval(simInterval);}
    set({ isSimulating: false, isPowered: false, simInterval: null });
    // reset all LEDs
    set((s) => ({
      components: s.components.map((c) =>
        c.type === 'led' ? { ...c, isOn: false, brightness: 0 } : c
      ),
    }));
  },

  simulationTick: () => {
    const { components, connections, pins, isPowered } = get();
    if (!isPowered) {return;}

    // Build a simple voltage map from connections
    const voltageMap: Record<string, number> = {};

    // Mark arduino power pins as HIGH
    components.forEach((comp) => {
      if (comp.type === 'arduino') {
        // 5V and GND reference pins
        Object.keys(pins).forEach((pid) => {
          if (pid.startsWith(`${comp.id}-5v`)) {voltageMap[pid] = 5;}
          if (pid.startsWith(`${comp.id}-gnd`)) {voltageMap[pid] = 0;}
          if (pid.startsWith(`${comp.id}-d`)) {voltageMap[pid] = 5;} // default HIGH simplification
        });
      }
    });

    // Propagate through connections
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 20) {
      changed = false;
      iterations++;
      connections.forEach((conn) => {
        const fromV = voltageMap[conn.from];
        const toV = voltageMap[conn.to];
        if (fromV !== undefined && toV === undefined) {
          voltageMap[conn.to] = fromV;
          changed = true;
        }
        if (toV !== undefined && fromV === undefined) {
          voltageMap[conn.from] = toV;
          changed = true;
        }
      });
    }

    // Update component states
    set((s) => ({
      components: s.components.map((comp) => {
        if (comp.type === 'led') {
          // Check if anode is HIGH and cathode is LOW
          const anodePin = `${comp.id}-anode`;
          const cathodePin = `${comp.id}-cathode`;
          const anodeV = voltageMap[anodePin] ?? 0;
          const cathodeV = voltageMap[cathodePin] ?? 0;
          const isOn = anodeV > cathodeV + 1;
          return { ...comp, isOn, brightness: isOn ? 1 : 0 };
        }
        if (comp.type === 'buzzer') {
          const posPin = `${comp.id}-pos`;
          return { ...comp, isOn: (voltageMap[posPin] ?? 0) > 2 };
        }
        if (comp.type === 'servo') {
          // Animate servo swing
          const signalPin = `${comp.id}-signal`;
          const v = voltageMap[signalPin] ?? 0;
          if (v > 2) {
            return { ...comp, servoAngle: (comp.servoAngle ?? 0 + 5) % 180 };
          }
        }
        return comp;
      }),
    }));
  },

  // ── Experiments ──
  activeExperimentId: null,
  setActiveExperiment: (id, def) => {
    set({
      activeExperimentId: id,
      components: def.components,
      connections: def.connections ?? [],
      pins: {},
      isSimulating: false,
      isPowered: false,
    });
  },
  resetWorkspace: () => {
    set({ 
      components: [], 
      connections: [], 
      pins: {}, 
      isSimulating: false, 
      isPowered: false,
      activeExperimentId: null,
      selectedComponentId: null,
      wireStartPinId: null,
      activePinId: null
    });
  },

  selectedComponentId: null,
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),

  wireStartPinId: null,
  setWireStartPin: (id) => set({ wireStartPinId: id }),

  // ── Pin Calibration Mode ───
  calibrationMode: false,
  setCalibrationMode: (active) => set({ calibrationMode: active, wireStartPinId: null, activePinId: null }),
  userPins: {},
  addUserPin: (componentType, pin) =>
    set((s) => ({
      userPins: {
        ...s.userPins,
        [componentType]: [...(s.userPins[componentType] || []), pin]
      }
    })),
  removeUserPin: (componentType, pinId) =>
    set((s) => ({
      userPins: {
        ...s.userPins,
        [componentType]: (s.userPins[componentType] || []).filter(p => p.id !== pinId)
      }
    })),

  // ── Transform Mode ───
  transformMode: null,
  setTransformMode: (mode) => set({ transformMode: mode }),
}));

// Export the addConnection helper with auto ID
export function connectPins(from: string, to: string) {
  useCircuitStore.getState().addConnection({
    id: genConnId(),
    from,
    to,
    isLive: false,
  });
}
