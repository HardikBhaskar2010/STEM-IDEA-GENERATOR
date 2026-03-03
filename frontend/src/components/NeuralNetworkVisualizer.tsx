import React, { useEffect, useRef, useState } from 'react';
import { Brain } from 'lucide-react';

interface NeuralNetworkVisualizerProps {
  isActive?: boolean;
  className?: string;
  message?: string;
}

interface Node {
  x: number;
  y: number;
  radius: number;
  layer: number;
  activation: number;
}

interface Connection {
  from: Node;
  to: Node;
  weight: number;
  active: boolean;
}

export const NeuralNetworkVisualizer: React.FC<NeuralNetworkVisualizerProps> = ({
  isActive = false,
  className = '',
  message = 'AI Processing...'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // Initialize neural network structure
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Define network structure: [input, hidden1, hidden2, output]
    const layers = [4, 6, 6, 3];
    const nodeRadius = 8;
    const layerSpacing = width / (layers.length + 1);
    
    const newNodes: Node[] = [];
    const newConnections: Connection[] = [];

    // Create nodes for each layer
    layers.forEach((nodeCount, layerIndex) => {
      const layerX = layerSpacing * (layerIndex + 1);
      const nodeSpacing = height / (nodeCount + 1);

      for (let i = 0; i < nodeCount; i++) {
        const node: Node = {
          x: layerX,
          y: nodeSpacing * (i + 1),
          radius: nodeRadius,
          layer: layerIndex,
          activation: Math.random()
        };
        newNodes.push(node);

        // Create connections to previous layer
        if (layerIndex > 0) {
          const prevLayerNodes = newNodes.filter(n => n.layer === layerIndex - 1);
          prevLayerNodes.forEach(prevNode => {
            newConnections.push({
              from: prevNode,
              to: node,
              weight: Math.random() * 2 - 1, // -1 to 1
              active: false
            });
          });
        }
      }
    });

    setNodes(newNodes);
    setConnections(newConnections);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const animate = () => {
      frame++;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw connections
      connections.forEach((conn, idx) => {
        // Activate connections in waves
        const activationDelay = conn.from.layer * 10 + idx * 2;
        conn.active = (frame % 60) > activationDelay && (frame % 60) < activationDelay + 15;

        // Draw connection
        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);
        
        if (conn.active) {
          const gradient = ctx.createLinearGradient(
            conn.from.x, conn.from.y,
            conn.to.x, conn.to.y
          );
          gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
          gradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
          ctx.lineWidth = 1;
        }
        
        ctx.stroke();
      });

      // Update and draw nodes
      nodes.forEach((node, idx) => {
        // Update activation based on incoming connections
        const incomingActive = connections.filter(
          c => c.to === node && c.active
        ).length;
        node.activation = Math.min(1, incomingActive / 3);

        // Pulsing effect
        const pulse = Math.sin(frame * 0.05 + idx * 0.3) * 0.2 + 0.8;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        // Gradient fill based on activation
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius
        );
        
        const alpha = 0.3 + node.activation * 0.7;
        gradient.addColorStop(0, `rgba(168, 85, 247, ${alpha * pulse})`);
        gradient.addColorStop(1, `rgba(168, 85, 247, ${alpha * 0.3 * pulse})`);
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Outer glow for active nodes
        if (node.activation > 0.5) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${node.activation * 0.8})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, nodes, connections]);

  if (!isActive) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Canvas */}
      <div className="glass-effect border-primary/20 rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Brain className="w-6 h-6 text-primary animate-pulse" />
            <span className="absolute inset-0 animate-ping">
              <Brain className="w-6 h-6 text-primary opacity-75" />
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gradient">{message}</h3>
            <p className="text-xs text-muted-foreground">Neural network processing your request</p>
          </div>
        </div>
        
        <div className="relative bg-background/50 rounded-xl overflow-hidden border border-primary/10">
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="w-full h-auto"
          />
          
          {/* Scanning line effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-scan" />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground">Neurons Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Synapses Firing</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Model:</span>
            <span className="font-mono text-primary">upstage/solar-pro-3</span>
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10 animate-pulse" />
    </div>
  );
};

// Add scanning animation to global CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  .animate-scan {
    animation: scan 3s ease-in-out infinite;
  }
`;
document.head.appendChild(style);
