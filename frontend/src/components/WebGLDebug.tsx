'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { webglManager } from '@/lib/webglManager';
import { useThreeD } from '@/contexts/ThreeDContext';
import { Monitor, Zap, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const WebGLDebug: React.FC = () => {
  const [webglInfo, setWebglInfo] = useState(webglManager.getContextInfo());
  const [settings, setSettings] = useState(webglManager.getRecommendedSettings());
  const { capability, enable3D, isLoading } = useThreeD();

  const refreshInfo = () => {
    setWebglInfo(webglManager.getContextInfo());
    setSettings(webglManager.getRecommendedSettings());
  };

  useEffect(() => {
    const interval = setInterval(refreshInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isSupported: boolean) => {
    return isSupported ? 'bg-green-500' : 'bg-red-500';
  };

  const getCapabilityColor = (cap: string) => {
    switch (cap) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      case 'minimal': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="p-6 space-y-4 bg-background/95 backdrop-blur-sm border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">WebGL Debug Info</h3>
        </div>
        <Button onClick={refreshInfo} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WebGL Support */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            WebGL Support
          </h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supported:</span>
              <Badge className={getStatusColor(webglInfo?.isSupported || false)}>
                {webglInfo?.isSupported ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertTriangle className="w-3 h-3 mr-1" />
                )}
                {webglInfo?.isSupported ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contexts:</span>
              <span className="text-sm font-mono">
                {webglInfo?.currentContexts || 0}/{webglInfo?.maxContexts || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vendor:</span>
              <span className="text-sm font-mono text-right max-w-32 truncate">
                {webglInfo?.vendor || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renderer:</span>
              <span className="text-sm font-mono text-right max-w-32 truncate">
                {webglInfo?.renderer || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Device Capability */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Device Capability
          </h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Level:</span>
              <Badge className={getCapabilityColor(capability || 'unknown')}>
                {capability || 'Detecting...'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">3D Enabled:</span>
              <Badge className={getStatusColor(enable3D)}>
                {isLoading ? 'Loading...' : enable3D ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max Particles:</span>
              <span className="text-sm font-mono">{settings.maxParticles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pixel Ratio:</span>
              <span className="text-sm font-mono">{settings.pixelRatio.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        <h4 className="font-medium">Current Settings</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant={settings.enableWebGL ? 'default' : 'destructive'}>
            WebGL: {settings.enableWebGL ? 'On' : 'Off'}
          </Badge>
          <Badge variant={settings.enableShadows ? 'default' : 'secondary'}>
            Shadows: {settings.enableShadows ? 'On' : 'Off'}
          </Badge>
          <Badge variant={settings.enablePostProcessing ? 'default' : 'secondary'}>
            Post-FX: {settings.enablePostProcessing ? 'On' : 'Off'}
          </Badge>
        </div>
      </div>

      {/* Troubleshooting */}
      {!webglInfo?.isSupported && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">WebGL Not Supported</p>
              <p className="text-xs text-muted-foreground">
                Your browser or graphics card doesn't support WebGL. 3D features are disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {webglInfo?.isSupported && !enable3D && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-600">3D Disabled</p>
              <p className="text-xs text-muted-foreground">
                3D rendering is disabled due to performance constraints or user preferences.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};