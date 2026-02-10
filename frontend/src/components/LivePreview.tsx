'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  RefreshCw, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Monitor, 
  Smartphone, 
  Tablet,
  AlertTriangle,
  Globe,
  Code,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CodeFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content: string;
  description?: string;
  size_bytes: number;
  is_main_file: boolean;
}

interface LivePreviewProps {
  files: CodeFile[];
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  onRefresh?: () => void;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const LivePreview: React.FC<LivePreviewProps> = ({
  files,
  platform,
  onRefresh,
  className,
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [showConsole, setShowConsole] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filesHash, setFilesHash] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate hash of files content for change detection
  const generateFilesHash = (files: CodeFile[]): string => {
    return files
      .map(f => `${f.id}:${f.content.length}:${f.file_name}`)
      .sort()
      .join('|');
  };

  // Auto-refresh when files change
  useEffect(() => {
    if (!autoRefresh || platform !== 'web') return;

    const newHash = generateFilesHash(files);
    if (newHash !== filesHash && filesHash !== '') {
      // Files have changed, schedule refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        handleRefresh();
      }, refreshInterval);
    }
    setFilesHash(newHash);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [files, autoRefresh, platform, refreshInterval, filesHash]);

  // Initialize files hash
  useEffect(() => {
    setFilesHash(generateFilesHash(files));
  }, []);

  // Generate preview HTML for web projects
  const previewHtml = useMemo(() => {
    if (platform !== 'web') return null;

    const htmlFile = files.find(f => f.file_type === 'html' || f.file_name.endsWith('.html'));
    const cssFiles = files.filter(f => f.file_type === 'css' || f.file_name.endsWith('.css'));
    const jsFiles = files.filter(f => f.file_type === 'js' || f.file_name.endsWith('.js'));

    if (!htmlFile) {
      // Generate a basic HTML structure if no HTML file exists
      const hasReactComponents = files.some(f => f.file_type === 'jsx' || f.file_type === 'tsx');
      
      if (hasReactComponents) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Component Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    ${cssFiles.map(css => `<style>${css.content}</style>`).join('\n')}
</head>
<body>
    <div id="root"></div>
    <div style="padding: 20px; text-align: center; color: #666;">
        <h3>React Component Preview</h3>
        <p>This is a preview of your React components. Full functionality may require a proper build setup.</p>
    </div>
    ${jsFiles.map(js => `<script type="text/babel">${js.content}</script>`).join('\n')}
</body>
</html>`;
      }

      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project Preview</title>
    ${cssFiles.map(css => `<style>${css.content}</style>`).join('\n')}
</head>
<body>
    <div style="padding: 20px; text-align: center;">
        <h1>Generated Project</h1>
        <p>No HTML file found. Here are the generated files:</p>
        <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
            ${files.map(f => `<li><strong>${f.file_name}</strong> (${f.file_type})</li>`).join('')}
        </ul>
    </div>
    ${jsFiles.map(js => `<script>${js.content}</script>`).join('\n')}
</body>
</html>`;
    }

    // Use existing HTML file and inject CSS/JS
    let html = htmlFile.content;

    // Inject CSS files
    if (cssFiles.length > 0) {
      const cssInjects = cssFiles.map(css => `<style>${css.content}</style>`).join('\n');
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${cssInjects}\n</head>`);
      } else {
        html = `<style>${cssFiles.map(css => css.content).join('\n')}</style>\n${html}`;
      }
    }

    // Inject JS files
    if (jsFiles.length > 0) {
      const jsInjects = jsFiles.map(js => `<script>${js.content}</script>`).join('\n');
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${jsInjects}\n</body>`);
      } else {
        html = `${html}\n<script>${jsFiles.map(js => js.content).join('\n')}</script>`;
      }
    }

    return html;
  }, [files, platform]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setPreviewError(null);
    
    // Set up console message capture
    if (iframeRef.current?.contentWindow) {
      try {
        const iframeWindow = iframeRef.current.contentWindow;
        const originalConsoleLog = iframeWindow.console.log;
        const originalConsoleError = iframeWindow.console.error;
        const originalConsoleWarn = iframeWindow.console.warn;

        iframeWindow.console.log = (...args: any[]) => {
          setConsoleMessages(prev => [...prev, `LOG: ${args.join(' ')}`]);
          originalConsoleLog.apply(iframeWindow.console, args);
        };

        iframeWindow.console.error = (...args: any[]) => {
          setConsoleMessages(prev => [...prev, `ERROR: ${args.join(' ')}`]);
          originalConsoleError.apply(iframeWindow.console, args);
        };

        iframeWindow.console.warn = (...args: any[]) => {
          setConsoleMessages(prev => [...prev, `WARN: ${args.join(' ')}`]);
          originalConsoleWarn.apply(iframeWindow.console, args);
        };

        // Listen for errors
        iframeWindow.addEventListener('error', (event) => {
          setPreviewError(`JavaScript Error: ${event.error?.message || 'Unknown error'}`);
          setConsoleMessages(prev => [...prev, `ERROR: ${event.error?.message || 'Unknown error'}`]);
        });
      } catch (error) {
        console.warn('Could not set up iframe console capture:', error);
      }
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    setConsoleMessages([]);
    setPreviewError(null);
    setLastRefresh(new Date());
    
    // Add error boundary for iframe content
    try {
      if (iframeRef.current) {
        // Force iframe reload by updating srcDoc
        const currentSrcDoc = iframeRef.current.getAttribute('srcdoc');
        iframeRef.current.setAttribute('srcdoc', '');
        setTimeout(() => {
          if (iframeRef.current && previewHtml) {
            iframeRef.current.setAttribute('srcdoc', previewHtml);
          }
        }, 50);
      }
      onRefresh?.();
    } catch (error) {
      setPreviewError(`Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Handle iframe errors
  const handleIframeError = (error: string) => {
    setPreviewError(error);
    setIsLoading(false);
    setConsoleMessages(prev => [...prev, `ERROR: ${error}`]);
  };

  // Viewport size configurations
  const viewportConfigs = {
    desktop: { width: '100%', height: '100%', icon: Monitor, label: 'Desktop' },
    tablet: { width: '768px', height: '1024px', icon: Tablet, label: 'Tablet' },
    mobile: { width: '375px', height: '667px', icon: Smartphone, label: 'Mobile' }
  };

  // Generate fallback content for non-web platforms
  const renderFallbackContent = () => {
    const platformInfo = {
      arduino: {
        icon: Code,
        title: 'Arduino Project',
        description: 'This Arduino project contains microcontroller code that runs on hardware.',
        instructions: [
          'Upload the .ino file to your Arduino IDE',
          'Connect your Arduino board via USB',
          'Select the correct board and port',
          'Click upload to flash the code to your device'
        ]
      },
      raspberry_pi: {
        icon: Code,
        title: 'Raspberry Pi Project',
        description: 'This Raspberry Pi project contains Python code for GPIO control and system integration.',
        instructions: [
          'Copy the files to your Raspberry Pi',
          'Install required dependencies with pip',
          'Run the main Python script',
          'Check GPIO connections if using hardware'
        ]
      },
      mobile: {
        icon: Smartphone,
        title: 'Mobile App Project',
        description: 'This mobile project contains Flutter/Dart code for cross-platform app development.',
        instructions: [
          'Ensure Flutter SDK is installed',
          'Run "flutter pub get" to install dependencies',
          'Use "flutter run" to start the app',
          'Test on emulator or physical device'
        ]
      }
    };

    const info = platformInfo[platform as keyof typeof platformInfo];
    if (!info) return null;

    const Icon = info.icon;

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Icon className="w-16 h-16 text-white/20 mb-6" />
        <h3 className="text-xl font-semibold text-white mb-3">{info.title}</h3>
        <p className="text-white/60 mb-6 max-w-md">{info.description}</p>
        
        <div className="bg-white/5 rounded-lg p-4 border border-white/10 max-w-md">
          <h4 className="text-white font-medium mb-3">Setup Instructions:</h4>
          <ol className="text-sm text-white/70 space-y-2 text-left">
            {info.instructions.map((instruction, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-purple-400 font-medium">{index + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {files.map(file => (
            <Badge key={file.id} variant="secondary" className="bg-white/10 text-white/80">
              {file.file_name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", isFullscreen && "fixed inset-0 z-50 bg-black", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium">Live Preview</span>
          <Badge variant="secondary" className="text-xs bg-white/10 text-white/60">
            {platform}
          </Badge>
          {platform === 'web' && (
            <span className="text-xs text-white/40">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport size selector for web */}
          {platform === 'web' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                  {React.createElement(viewportConfigs[viewportSize].icon, { className: "w-4 h-4" })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                {Object.entries(viewportConfigs).map(([size, config]) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => setViewportSize(size as ViewportSize)}
                    className="text-white hover:bg-white/10"
                  >
                    {React.createElement(config.icon, { className: "w-4 h-4 mr-2" })}
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Console toggle for web */}
          {platform === 'web' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConsole(!showConsole)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              {showConsole ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>

          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main preview area */}
        <div className="flex-1 flex flex-col">
          {platform === 'web' ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
              {previewError ? (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-medium text-red-400 mb-2">Preview Error</h3>
                  <p className="text-red-300 text-sm mb-4">{previewError}</p>
                  <Button onClick={handleRefresh} variant="outline" className="border-red-400 text-red-400">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div 
                  className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                  style={{
                    width: viewportConfigs[viewportSize].width,
                    height: viewportConfigs[viewportSize].height,
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                >
                  {isLoading && (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <span className="text-sm text-gray-600">Loading preview...</span>
                      </div>
                    </div>
                  )}
                  {previewHtml && (
                    <iframe
                      ref={iframeRef}
                      srcDoc={previewHtml}
                      onLoad={handleIframeLoad}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                      title="Live Preview"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-white/5">
              {renderFallbackContent()}
            </div>
          )}
        </div>

        {/* Console panel for web */}
        {platform === 'web' && showConsole && (
          <div className="w-80 border-l border-white/10 bg-black/50 flex flex-col">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-white font-medium text-sm">Console</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {consoleMessages.length === 0 ? (
                <div className="text-white/40 text-xs">No console messages</div>
              ) : (
                consoleMessages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-xs font-mono p-1 rounded",
                      message.startsWith('ERROR:') && "text-red-300 bg-red-500/10",
                      message.startsWith('WARN:') && "text-yellow-300 bg-yellow-500/10",
                      message.startsWith('LOG:') && "text-white/70"
                    )}
                  >
                    {message}
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-white/10">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConsoleMessages([])}
                className="w-full text-white/60 hover:text-white hover:bg-white/10"
              >
                Clear Console
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t border-white/10 bg-black/50 text-xs text-white/60">
        <div className="flex items-center gap-4">
          <span>Platform: {platform}</span>
          <span>Files: {files.length}</span>
          {platform === 'web' && (
            <span>Viewport: {viewportConfigs[viewportSize].label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {platform === 'web' ? (
            <span className="text-green-300">Live Preview Active</span>
          ) : (
            <span className="text-blue-300">Hardware Project</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivePreview;