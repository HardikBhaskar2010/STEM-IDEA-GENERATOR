/**
 * PerformanceMonitor Component
 * Phase 9: Performance & Accessibility
 * 
 * Real-time performance monitoring dashboard
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Cpu, HardDrive } from 'lucide-react';
import { FPSMonitor, performanceTracker } from '@/lib/performanceMetrics';
import { getMemoryUsage } from '@/lib/memoryManager';
import { Button } from '@/components/ui/button';

interface PerformanceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceMonitor({ isOpen, onClose }: PerformanceMonitorProps) {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState({ used: 0, total: 0, percentage: 0 });
  const [budget, setBudget] = useState({ ok: true, violations: [] as string[] });

  useEffect(() => {
    if (!isOpen) return;

    // FPS Monitor
    const fpsMonitor = new FPSMonitor();
    fpsMonitor.start((currentFps) => {
      setFps(currentFps);
      performanceTracker.record('fps', currentFps, 'fps');
    });

    // Memory Monitor
    const memoryInterval = setInterval(() => {
      const memUsage = getMemoryUsage();
      if (memUsage) {
        setMemory(memUsage);
        performanceTracker.record('memory', memUsage.used, 'memory');
      }
    }, 1000);

    // Budget Check
    const budgetInterval = setInterval(() => {
      setBudget(performanceTracker.isWithinBudget());
    }, 2000);

    return () => {
      fpsMonitor.stop();
      clearInterval(memoryInterval);
      clearInterval(budgetInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-[100] w-80 bg-black/90 backdrop-blur-xl border border-purple-500/30 rounded-lg shadow-2xl"
        data-testid="performance-monitor-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Performance Monitor</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-purple-500/20"
            data-testid="performance-monitor-close-button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Metrics */}
        <div className="p-4 space-y-4">
          {/* FPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">FPS</span>
              </div>
              <span className={`text-lg font-bold ${getFPSColor(fps)}`}>
                {Math.round(fps)}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getFPSColor(fps).replace('text-', 'bg-')}`}
                style={{ width: `${Math.min((fps / 60) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Memory</span>
              </div>
              <span className={`text-sm font-bold ${getMemoryColor(memory.percentage)}`}>
                {memory.used}MB / {memory.total}MB
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getMemoryColor(memory.percentage).replace('text-', 'bg-')}`}
                style={{ width: `${memory.percentage}%` }}
              />
            </div>
          </div>

          {/* Budget Violations */}
          {!budget.ok && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Budget Violations</span>
              </div>
              <ul className="space-y-1">
                {budget.violations.map((violation, i) => (
                  <li key={i} className="text-xs text-red-300">
                    • {violation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
            <span className="text-xs text-gray-400">Status</span>
            <span className={`text-xs font-semibold ${budget.ok ? 'text-green-400' : 'text-yellow-400'}`}>
              {budget.ok ? 'Within Budget' : 'Optimizations Needed'}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


