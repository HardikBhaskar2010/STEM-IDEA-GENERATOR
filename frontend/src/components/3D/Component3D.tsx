import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html, useGLTF, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { useCircuitStore, ComponentType } from '@/store/useCircuitStore';

// ─── Color palette ────────────────────────────────────────────────────────────
const NEON_CYAN = '#00e5ff';
const NEON_PURPLE = '#bb00ff';
const NEON_GREEN = '#39ff14';

// ─── Per-component shapes ─────────────────────────────────────────────────────

// Helper to render interactive pin attachment points on the models
function PinNode({ 
  id, 
  position, 
  label, 
  color = '#00e5ff', 
  size = 0.05 
}: { 
  id: string, 
  position: [number, number, number], 
  label: string, 
  color?: string,
  size?: number 
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const { setActivePinId, activePinId, wireStartPinId, setWireStartPin, connectPins, registerPin } = useCircuitStore();

  // Register pin with its absolute world position on mount and update
  React.useEffect(() => {
    // Need a tiny delay to ensure layout and world matrix is computed by Three.js
    const timer = setTimeout(() => {
      if (groupRef.current) {
        const worldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(worldPos);
        registerPin({
          id,
          componentId: id.split('-')[0],
          label,
          isInput: false,
          position: [worldPos.x, worldPos.y, worldPos.z],
          isActive: false,
          voltage: 0
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [id, label, registerPin]);

  const isSelected = activePinId === id || wireStartPinId === id;

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    
    // Wire drawing logic
    if (wireStartPinId) {
      if (wireStartPinId !== id) {
        // Complete the connection
        connectPins(wireStartPinId, id);
      }
      setWireStartPin(null);
      setActivePinId(null);
    } else {
      // Start a new wire
      setWireStartPin(id);
      setActivePinId(id);
    }
  };

  return (
    <group 
      ref={groupRef}
      position={position} 
      onClick={handleClick as unknown as React.EventHandler<React.SyntheticEvent>}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'crosshair'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* Always-visible square pad marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 2, size * 2]} />
        <meshBasicMaterial
          color={isSelected ? '#ffff00' : hovered ? '#ffffff' : color}
          side={THREE.DoubleSide}
          transparent
          opacity={isSelected ? 1 : hovered ? 0.95 : 0.85}
        />
      </mesh>

      {/* Glow border ring on hover / selected */}
      {(hovered || isSelected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 2.2, size * 2.8, 4]} />
          <meshBasicMaterial color={isSelected ? '#ffff00' : color} side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Invisible larger clickable hitbox */}
      <mesh>
        <boxGeometry args={[size * 5, size * 5, size * 5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Label tooltip on hover */}
      {(hovered || isSelected) && (
        <Html distanceFactor={4} position={[0, size * 4, 0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.92)',
            border: `1px solid ${isSelected ? '#ffff00' : '#00e5ff'}`,
            color: isSelected ? '#ffff00' : '#00e5ff',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            pointerEvents: 'none',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em'
          }}>
            {isSelected ? `⚡ ${label}` : label}
          </div>
        </Html>
      )}
    </group>
  );
}

function ArduinoMesh({ comp }: { comp: PlacedComponent }) {
  // Preload to avoid harsh popping
  const { nodes, materials } = useGLTF('/arduino_uno_-_low_poly.glb') as any;
  
  return (
    <group position={[0, 0.05, 0]}>
      {/* The imported GLB model */}
      <group position={[-0.2, -0.05, 0.4]} rotation={[-Math.PI / 2, 0, 0]} scale={12}>
        <mesh castShadow receiveShadow geometry={nodes.Arduino_Blue2_FiberGlass_0.geometry} material={materials.FiberGlass} />
        <mesh castShadow receiveShadow geometry={nodes.Arduino_Blue2_Metal_0.geometry} material={materials.Metal} />
        <mesh castShadow receiveShadow geometry={nodes.Arduino_Blue2_Back_0.geometry} material={materials.Back} />
        <mesh castShadow receiveShadow geometry={nodes.Arduino_Blue2_LED_0.geometry} material={materials.material} />
      </group>
      
      {/* Interactive Pin Nodes mapping to the GLB geometry */}
      {/* Digital Pins (top edge of board) */}
      <PinNode id={`${comp.id}-gnd`} label="GND" position={[0.42, 0.4, -0.65]} color="#4444ff" />
      <PinNode id={`${comp.id}-d13`} label="D13" position={[0.55, 0.4, -0.65]} color={NEON_CYAN} />
      <PinNode id={`${comp.id}-d12`} label="D12" position={[0.62, 0.4, -0.65]} color={NEON_CYAN} />
      <PinNode id={`${comp.id}-d11`} label="D11~" position={[0.69, 0.4, -0.65]} color={NEON_CYAN} />
      <PinNode id={`${comp.id}-d10`} label="D10~" position={[0.76, 0.4, -0.65]} color={NEON_CYAN} />
      <PinNode id={`${comp.id}-d9`} label="D9~" position={[0.83, 0.4, -0.65]} color={NEON_CYAN} />
      <PinNode id={`${comp.id}-d8`} label="D8" position={[0.90, 0.4, -0.65]} color={NEON_CYAN} />
      
      {/* Power Pins (bottom edge of board) */}
      <PinNode id={`${comp.id}-5v`} label="5V" position={[0.42, 0.4, 0.55]} color="#ff4444" />
      <PinNode id={`${comp.id}-gnd2`} label="GND" position={[0.55, 0.4, 0.55]} color="#4444ff" />
      
      {/* Analog Pins (bottom edge of board right) */}
      <PinNode id={`${comp.id}-a0`} label="A0" position={[0.9, 0.4, 0.55]} color={NEON_GREEN} />
      <PinNode id={`${comp.id}-a1`} label="A1" position={[0.97, 0.4, 0.55]} color={NEON_GREEN} />
      <PinNode id={`${comp.id}-a2`} label="A2" position={[1.04, 0.4, 0.55]} color={NEON_GREEN} />

      {/* Invisible interaction/hitbox plane */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 0.2, 1.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
useGLTF.preload('/arduino_uno_-_low_poly.glb');

function BreadboardMesh() {
  const { nodes, materials } = useGLTF('/arduino_breadboard_-_low_poly.glb') as any;
  return (
    <group position={[0, 0.02, 0]}>
      {/* Imported GLB */}
      <mesh 
        castShadow 
        receiveShadow 
        geometry={nodes.LP_breadboard_0.geometry} 
        material={materials.breadboard} 
        rotation={[-Math.PI / 2, 0, 0]} 
        scale={[28, 6, 2.5]} 
      />
      
      {/* Example Pin Nodes mapping to the breadboard grid */}
      {/* Power rails */}
      <PinNode id="bb-p1" label="+" position={[-1.2, 0.2, -0.45]} color="#ff4444" />
      <PinNode id="bb-g1" label="-" position={[-1.2, 0.2, -0.35]} color="#4444ff" />
      
      {/* Terminal strips */}
      {Array.from({ length: 5 }, (_, i) => (
         <PinNode key={i} id={`bb-t${i}`} label={`Row ${i+1}`} position={[-1.0 + (i*0.15), 0.2, -0.1]} color="#cccccc" />
      ))}

      {/* Invisible interaction/hitbox plane */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.2, 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
useGLTF.preload('/arduino_breadboard_-_low_poly.glb');

function LEDMesh({ comp }: { comp: PlacedComponent }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const isOn = comp.isOn ?? false;
  const color = comp.color ?? '#ff3333';
  const brightness = comp.brightness ?? 0;

  useFrame((_, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const targetIntensity = isOn ? 1.5 : 0;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, delta * 5);
    }
    if (glowRef.current) {
      glowRef.current.intensity = THREE.MathUtils.lerp(glowRef.current.intensity, isOn ? 2 : 0, delta * 5);
    }
  });

  return (
    <group scale={2}>
      {/* Leads */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
        <meshStandardMaterial color="#c0a060" metalness={0.9} />
      </mesh>
      <mesh position={[0.04, -0.22, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
        <meshStandardMaterial color="#c0a060" metalness={0.9} />
      </mesh>
      {/* Body */}
      <mesh ref={meshRef} position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isOn ? 1.5 : 0}
          transparent
          opacity={0.9}
          roughness={0.1}
          metalness={0}
        />
      </mesh>
      
      <PinNode id={`${comp.id}-anode`} label="+" position={[0.04, -0.4, 0]} color="#ff4444" size={0.08} />
      <PinNode id={`${comp.id}-cathode`} label="-" position={[0, -0.4, 0]} color="#4444ff" size={0.08} />

      {/* Glow light */}
      {isOn && (
        <pointLight
          ref={glowRef}
          position={[0, 0.3, 0]}
          color={color}
          intensity={brightness * 2}
          distance={3}
        />
      )}
    </group>
  );
}

function ResistorMesh({ comp }: { comp: PlacedComponent }) {
  const bands = ['#c8a000', '#222222', '#883300', '#c8a000']; // gold/black/orange example
  return (
    <group rotation={[0, 0, Math.PI / 2]} scale={1.5}>
      {/* Leads */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
        <meshStandardMaterial color="#c0a060" metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
        <meshStandardMaterial color="#c0a060" metalness={0.9} />
      </mesh>
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.35, 12]} />
        <meshStandardMaterial color="#d4b483" roughness={0.8} />
      </mesh>
      {/* Color bands */}
      {bands.map((color, i) => (
        <mesh key={i} position={[0, -0.1 + i * 0.06, 0]}>
          <cylinderGeometry args={[0.082, 0.082, 0.03, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      
      <PinNode id={`${comp.id}-in`} label="IN" position={[0, 0.45, 0]} color="#aaaaaa" size={0.06} />
      <PinNode id={`${comp.id}-out`} label="OUT" position={[0, -0.45, 0]} color="#aaaaaa" size={0.06} />
    </group>
  );
}

function ButtonMesh({ comp }: { comp: PlacedComponent }) {
  const pressed = comp.buttonState ?? false;
  const store = useCircuitStore();

  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.28, 0.04, 0.28]} />
        <meshStandardMaterial color="#222222" roughness={0.7} />
      </mesh>
      {/* Button cap */}
      <mesh
        position={[0, pressed ? 0.05 : 0.07, 0]}
        onClick={() => store.updateComponent(comp.id, { buttonState: !pressed })}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.04, 16]} />
        <meshStandardMaterial color={pressed ? NEON_CYAN : '#cc3333'} emissive={pressed ? NEON_CYAN : '#000'} emissiveIntensity={pressed ? 0.8 : 0} />
      </mesh>
      {/* Legs */}
      {[[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.03, z]}>
          <boxGeometry args={[0.02, 0.06, 0.02]} />
          <meshStandardMaterial color="#c0a060" metalness={0.9} />
        </mesh>
      ))}

      <PinNode id={`${comp.id}-in`} label="IN" position={[-0.1, 0, 0.1]} color="#aaaaaa" size={0.05} />
      <PinNode id={`${comp.id}-out`} label="OUT" position={[0.1, 0, -0.1]} color="#aaaaaa" size={0.05} />
    </group>
  );
}

function PotentiometerMesh({ comp }: { comp: PlacedComponent }) {
  const knobRef = useRef<THREE.Mesh>(null);
  const value = (comp.potValue ?? 512) / 1023;

  useFrame(() => {
    if (knobRef.current) {
      knobRef.current.rotation.y = value * Math.PI * 2.4 - Math.PI * 1.2;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.3, 0.08, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} metalness={0.3} />
      </mesh>
      <mesh ref={knobRef} position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 16]} />
        <meshStandardMaterial color="#444466" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Indicator dot */}
      <mesh position={[0, 0.16, 0.1]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color={NEON_CYAN} emissive={NEON_CYAN} emissiveIntensity={1} />
      </mesh>
      <Text position={[0, 0.2, 0]} fontSize={0.06} color={NEON_CYAN} anchorX="center">
        {Math.round(value * 1023)}
      </Text>

      <PinNode id={`${comp.id}-vcc`} label="VCC" position={[-0.1, 0, -0.15]} color="#ff4444" size={0.05} />
      <PinNode id={`${comp.id}-wiper`} label="WIPER" position={[0, 0, -0.15]} color={NEON_GREEN} size={0.05} />
      <PinNode id={`${comp.id}-gnd`} label="GND" position={[0.1, 0, -0.15]} color="#4444ff" size={0.05} />
    </group>
  );
}

function BuzzerMesh({ comp }: { comp: PlacedComponent }) {
  const isOn = comp.isOn ?? false;
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && isOn) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 20) * 0.05;
      ringRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.6} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.06, 0]}>
        <torusGeometry args={[0.15, 0.015, 8, 24]} />
        <meshStandardMaterial
          color={isOn ? NEON_CYAN : '#555555'}
          emissive={isOn ? NEON_CYAN : '#000'}
          emissiveIntensity={isOn ? 1 : 0}
        />
      </mesh>

      <PinNode id={`${comp.id}-pos`} label="+" position={[0.1, 0, -0.2]} color="#ff4444" size={0.05} />
      <PinNode id={`${comp.id}-neg`} label="-" position={[-0.1, 0, -0.2]} color="#4444ff" size={0.05} />
    </group>
  );
}

function ServoMesh({ comp }: { comp: PlacedComponent }) {
  const armRef = useRef<THREE.Group>(null);
  const angle = (comp.servoAngle ?? 90) * (Math.PI / 180);

  useFrame(() => {
    if (armRef.current) {
      armRef.current.rotation.y = angle - Math.PI / 2;
    }
  });

  return (
    <group>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.4, 0.24]} />
        <meshStandardMaterial color="#2244aa" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Shaft */}
      <mesh position={[0.18, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
        <meshStandardMaterial color="#888888" metalness={0.9} />
      </mesh>
      {/* Arm */}
      <group ref={armRef} position={[0.18, 0.27, 0]}>
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.4, 0.03, 0.06]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.4} />
        </mesh>
      </group>

      <PinNode id={`${comp.id}-gnd`} label="GND" position={[-0.25, -0.2, -0.05]} color="#884400" size={0.05} />
      <PinNode id={`${comp.id}-vcc`} label="5V" position={[-0.25, -0.2, 0]} color="#ff2222" size={0.05} />
      <PinNode id={`${comp.id}-signal`} label="SIG" position={[-0.25, -0.2, 0.05]} color="#ffaa00" size={0.05} />
    </group>
  );
}

function LDRMesh({ comp }: { comp: PlacedComponent }) {
  const value = (comp.ldrValue ?? 512) / 1023;
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.18, 0.04, 0.18]} />
        <meshStandardMaterial color="#ffe0b0" roughness={0.6} />
      </mesh>
      {/* Squiggle pattern representation */}
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.12]} />
        <meshStandardMaterial color="#884400" />
      </mesh>
      <Text position={[0, 0.06, 0]} fontSize={0.06} color={NEON_CYAN} anchorX="center">
        {Math.round(value * 1023)}
      </Text>

      <PinNode id={`${comp.id}-pin1`} label="1" position={[-0.05, 0, -0.09]} color="#cccccc" size={0.05} />
      <PinNode id={`${comp.id}-pin2`} label="2" position={[0.05, 0, -0.09]} color="#cccccc" size={0.05} />
    </group>
  );
}

// ─── Main Component3D export ──────────────────────────────────────────────────

interface Component3DProps {
  comp: PlacedComponent;
}

export const Component3D: React.FC<Component3DProps> = ({ comp }) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const { 
    selectedComponentId, 
    setSelectedComponentId, 
    calibrationMode, 
    addUserPin, 
    userPins,
    transformMode,
    updateComponent
  } = useCircuitStore();
  const isSelected = selectedComponentId === comp.id;

  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation();

    // In calibration mode, clicking the component surface adds a new pin
    if (calibrationMode) {
      if (groupRef.current && e.point) {
        // e.point is the world intersection coordinate
        const worldPos = e.point.clone();
        // Convert to local space of this component group
        const localPos = groupRef.current.worldToLocal(worldPos);
        
        const pinId = `usrpin-${Date.now()}`;
        const label = `Pin_${(userPins[comp.type]?.length || 0) + 1}`;
        
        console.log(`[CALIBRATION] ${comp.type} - ${label}: [${localPos.x.toFixed(4)}, ${localPos.y.toFixed(4)}, ${localPos.z.toFixed(4)}]`);
        
        addUserPin(comp.type, {
          id: pinId,
          componentId: comp.id,
          label: label,
          relativePosition: [localPos.x, localPos.y, localPos.z]
        });
      }
      return;
    }

    setSelectedComponentId(comp.id);
  }, [comp.id, setSelectedComponentId, calibrationMode, addUserPin, comp.type]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Hover bob
      if (hovered) {
        groupRef.current.position.y = comp.position[1] + Math.sin(Date.now() * 0.003) * 0.03;
      } else {
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          comp.position[1],
          delta * 5
        );
      }
    }
  });

  const renderMesh = () => {
    switch (comp.type) {
      case 'arduino': return <ArduinoMesh comp={comp} />;
      case 'breadboard': return <BreadboardMesh />;
      case 'led': return <LEDMesh comp={comp} />;
      case 'resistor': return <ResistorMesh comp={comp} />;
      case 'button': return <ButtonMesh comp={comp} />;
      case 'potentiometer': return <PotentiometerMesh comp={comp} />;
      case 'buzzer': return <BuzzerMesh comp={comp} />;
      case 'servo': return <ServoMesh comp={comp} />;
      case 'ldr': return <LDRMesh comp={comp} />;
      default: return null;
    }
  };

  const content = (
    <group
      ref={groupRef}
      position={comp.position}
      rotation={comp.rotation}
      onClick={handleClick as unknown as React.EventHandler<React.SyntheticEvent>}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = calibrationMode ? 'crosshair' : 'grab'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
    >

      {renderMesh()}

      {/* Selection outline */}
      {(isSelected || hovered) && (
        <mesh scale={[1.15, 1.15, 1.15]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial
            color={isSelected ? NEON_CYAN : NEON_PURPLE}
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Tooltip label */}
      {hovered && (
        <Html distanceFactor={6} position={[0, 0.6, 0]} center>
          <div className="bg-black/80 border border-cyan-400/50 text-cyan-300 text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
            {comp.label}
          </div>
        </Html>
      )}

      {/* Render custom pins generated in calibration mode */}
      {(userPins[comp.type] || []).map((pin) => (
        <PinNode
          key={pin.id}
          id={`${comp.id}-${pin.id}`} // Unique pin ID for this component instance
          label={pin.label}
          position={pin.relativePosition}
          color="#ff0044" // Red color for user-defined pins
          size={0.06}
        />
      ))}
    </group>
  );

  if (isSelected && transformMode) {
    return (
      <TransformControls
        mode={transformMode}
        onMouseUp={() => {
          if (groupRef.current) {
            const { position, rotation } = groupRef.current;
            updateComponent(comp.id, {
              position: [position.x, position.y, position.z],
              rotation: [rotation.x, rotation.y, rotation.z]
            });
          }
        }}
      >
        {content}
      </TransformControls>
    );
  }

  return content;
};

export default Component3D;
