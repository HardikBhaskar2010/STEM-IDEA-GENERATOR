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
  Settings,
  Zap,
  CheckCircle,
  XCircle,
  Terminal as TerminalIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import * as Babel from '@babel/standalone';

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

interface EnhancedLivePreviewProps {
  files: CodeFile[];
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  onRefresh?: () => void;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

interface DevServerStatus {
  status: 'idle' | 'building' | 'ready' | 'error';
  message: string;
}

const EnhancedLivePreview: React.FC<EnhancedLivePreviewProps> = ({
  files,
  platform,
  onRefresh,
  className,
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [showConsole, setShowConsole] = useState(true);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filesHash, setFilesHash] = useState<string>('');
  const [devServerStatus, setDevServerStatus] = useState<DevServerStatus>({
    status: 'idle',
    message: 'Dev server idle'
  });
  const [networkRequests, setNetworkRequests] = useState<Array<{ url: string; status: number; time: number }>>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Add console message
  const addConsoleMessage = (type: ConsoleMessage['type'], message: string) => {
    setConsoleMessages(prev => [...prev.slice(-99), { type, message, timestamp: new Date() }]);
  };

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
      addConsoleMessage('info', 'File changes detected, reloading...');
      
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

  // Transpile JSX/TSX using Babel
  const transpileCode = (code: string, filename: string): string => {
    try {
      if (filename.endsWith('.jsx') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.ts')) {
        const result = Babel.transform(code, {
          presets: [
            ['react', { runtime: 'automatic' }],
            'typescript'
          ],
          plugins: [],
          filename
        });
        return result.code || code;
      }
      return code;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addConsoleMessage('error', `Transpilation error in ${filename}: ${errorMsg}`);
      setPreviewError(`Transpilation failed in ${filename}: ${errorMsg}`);
      setDevServerStatus({ status: 'error', message: 'Build failed' });
      return `// Error transpiling ${filename}\nconsole.error("Transpilation error: ${errorMsg.replace(/"/g, '\\"')}");`;
    }
  };

  // Build dev server HTML
  const buildDevServerHTML = useMemo(() => {
    if (platform !== 'web') return null;

    setDevServerStatus({ status: 'building', message: 'Building project...' });
    addConsoleMessage('info', 'Starting dev server build...');

    try {
      const htmlFile = files.find(f => f.file_type === 'html' || f.file_name.endsWith('.html'));
      const cssFiles = files.filter(f => f.file_type === 'css' || f.file_name.endsWith('.css'));
      const jsFiles = files.filter(f => 
        ['js', 'jsx', 'ts', 'tsx'].includes(f.file_type) || 
        f.file_name.match(/\.(js|jsx|ts|tsx)$/)
      );

      let html = '';

      if (!htmlFile) {
        // Generate HTML structure
        const hasReact = files.some(f => ['jsx', 'tsx'].includes(f.file_type));
        
        html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Server - Veronica AI</title>
    ${hasReact ? `
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    ` : ''}
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
      ${cssFiles.map(css => css.content).join('\n')}
    </style>
</head>
<body>
    ${hasReact ? '<div id="root"></div>' : '<div id="app"></div>'}
    ${jsFiles.map((js, idx) => {
      const transpiledCode = transpileCode(js.content, js.file_name);
      return `<script>\n// File: ${js.file_name}\ntry {\n${transpiledCode}\n} catch(error) {\n  console.error('Error in ${js.file_name}:', error);\n  window.parent.postMessage({type: 'preview-error', error: error.toString(), file: '${js.file_name}'}, '*');\n}\n</script>`;
    }).join('\n')}
</body>
</html>`;
      } else {
        // Use existing HTML and inject assets
        html = htmlFile.content;

        // Inject CSS
        if (cssFiles.length > 0) {
          const cssInjects = `<style>\n${cssFiles.map(css => `/* ${css.file_name} */\n${css.content}`).join('\n')}\n</style>`;
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${cssInjects}\n</head>`);
          } else {
            html = cssInjects + html;
          }
        }

        // Inject JS
        if (jsFiles.length > 0) {
          const jsInjects = jsFiles.map((js, idx) => {
            const transpiledCode = transpileCode(js.content, js.file_name);
            return `<script>\n// File: ${js.file_name}\ntry {\n${transpiledCode}\n} catch(error) {\n  console.error('Error in ${js.file_name}:', error);\n  window.parent.postMessage({type: 'preview-error', error: error.toString(), file: '${js.file_name}'}, '*');\n}\n</script>`;
          }).join('\n');
          
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${jsInjects}\n</body>`);
          } else {
            html = html + jsInjects;
          }
        }
      }

      // Add error handling and console capture
      const errorHandlingScript = `
      <script>
        (function() {
          // Capture console messages
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };

          function formatArgs(args) {
            return Array.from(args).map(arg => {
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg, null, 2);
                } catch (e) {
                  return String(arg);
                }
              }
              return String(arg);
            }).join(' ');
          }

          console.log = function(...args) {
            window.parent.postMessage({type: 'console-log', message: formatArgs(args)}, '*');
            originalConsole.log.apply(console, args);
          };

          console.error = function(...args) {
            window.parent.postMessage({type: 'console-error', message: formatArgs(args)}, '*');
            originalConsole.error.apply(console, args);
          };

          console.warn = function(...args) {
            window.parent.postMessage({type: 'console-warn', message: formatArgs(args)}, '*');
            originalConsole.warn.apply(console, args);
          };

          console.info = function(...args) {
            window.parent.postMessage({type: 'console-info', message: formatArgs(args)}, '*');
            originalConsole.info.apply(console, args);
          };

          // Capture errors with stack traces
          window.addEventListener('error', (event) => {
            const errorInfo = {
              type: 'runtime-error',
              error: event.error?.message || event.message,
              stack: event.error?.stack || '',
              filename: event.filename || 'unknown',
              lineno: event.lineno || 0,
              colno: event.colno || 0
            };
            window.parent.postMessage(errorInfo, '*');
            return false; // Prevent default error handling
          });

          // Capture unhandled promise rejections
          window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason;
            window.parent.postMessage({
              type: 'unhandled-rejection',
              error: error?.message || String(error),
              stack: error?.stack || ''
            }, '*');
            event.preventDefault();
          });

          // Network request monitoring
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            const startTime = Date.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
            return originalFetch.apply(this, args)
              .then(response => {
                const endTime = Date.now();
                window.parent.postMessage({
                  type: 'network-request',
                  url: url,
                  status: response.status,
                  time: endTime - startTime,
                  ok: response.ok
                }, '*');
                return response;
              })
              .catch(error => {
                window.parent.postMessage({
                  type: 'network-error',
                  url: url,
                  error: error.message
                }, '*');
                throw error;
              });
          };

          // XMLHttpRequest monitoring
          const originalXHROpen = XMLHttpRequest.prototype.open;
          const originalXHRSend = XMLHttpRequest.prototype.send;
          
          XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            this._method = method;
            this._startTime = Date.now();
            return originalXHROpen.apply(this, arguments);
          };
          
          XMLHttpRequest.prototype.send = function() {
            this.addEventListener('load', function() {
              window.parent.postMessage({
                type: 'network-request',
                url: this._url,
                status: this.status,
                time: Date.now() - this._startTime,
                ok: this.status >= 200 && this.status < 300
              }, '*');
            });
            return originalXHRSend.apply(this, arguments);
          };

          // Signal preview is ready
          window.parent.postMessage({type: 'preview-ready'}, '*');
          
          // Send initial log message
          console.log('🚀 Preview loaded successfully');
        })();
      </script>
      `;

      if (html.includes('</body>')) {
        html = html.replace('</body>', `${errorHandlingScript}\n</body>`);
      } else {
        html = html + errorHandlingScript;
      }

      setDevServerStatus({ status: 'ready', message: 'Dev server ready' });
      addConsoleMessage('info', `Build completed in ${Date.now() - lastRefresh.getTime()}ms`);

      return html;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setDevServerStatus({ status: 'error', message: `Build failed: ${errorMsg}` });
      addConsoleMessage('error', `Build error: ${errorMsg}`);
      setPreviewError(errorMsg);
      return null;
    }
  }, [files, platform, lastRefresh]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, message, error, file, url, status, time } = event.data;

      switch (type) {
        case 'console-log':
          addConsoleMessage('log', message);
          break;
        case 'console-error':
          addConsoleMessage('error', message);
          break;
        case 'console-warn':
          addConsoleMessage('warn', message);
          break;
        case 'console-info':
          addConsoleMessage('info', message);
          break;
        case 'preview-error':
          setPreviewError(`Error in ${file}: ${error}`);
          addConsoleMessage('error', `${file}: ${error}`);
          break;
        case 'runtime-error':
          setPreviewError(error);
          addConsoleMessage('error', `Runtime error: ${error}`);
          break;
        case 'unhandled-rejection':
          addConsoleMessage('error', `Unhandled promise rejection: ${error}`);
          break;
        case 'network-request':
          setNetworkRequests(prev => [...prev.slice(-19), { url, status, time }]);
          addConsoleMessage('info', `${status} ${url} (${time}ms)`);
          break;
        case 'preview-ready':
          setIsLoading(false);
          setDevServerStatus({ status: 'ready', message: 'Preview loaded' });
          addConsoleMessage('info', 'Preview ready');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    setConsoleMessages([]);
    setNetworkRequests([]);
    setPreviewError(null);
    setLastRefresh(new Date());
    setDevServerStatus({ status: 'building', message: 'Rebuilding...' });
    
    addConsoleMessage('info', 'Refreshing preview...');

    // Force iframe reload
    if (iframeRef.current) {
      const currentSrcDoc = iframeRef.current.getAttribute('srcdoc');
      iframeRef.current.setAttribute('srcdoc', '');
      setTimeout(() => {
        if (iframeRef.current && buildDevServerHTML) {
          iframeRef.current.setAttribute('srcdoc', buildDevServerHTML);
        }
      }, 50);
    }
    
    onRefresh?.();
  };

  // Viewport configurations
  const viewportConfigs = {
    desktop: { width: '100%', height: '100%', icon: Monitor, label: 'Desktop (1920x1080)' },
    tablet: { width: '768px', height: '1024px', icon: Tablet, label: 'Tablet (768x1024)' },
    mobile: { width: '375px', height: '667px', icon: Smartphone, label: 'Mobile (375x667)' }
  };

  // Render fallback for non-web platforms
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
        description: 'This Raspberry Pi project contains Python code for GPIO control.',
        instructions: [
          'Copy files to your Raspberry Pi',
          'Install dependencies with pip',
          'Run the main Python script',
          'Check GPIO connections if using hardware'
        ]
      },
      mobile: {
        icon: Smartphone,
        title: 'Mobile App Project',
        description: 'Mobile project with Flutter/Dart code for cross-platform development.',
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
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium">Live Preview</span>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs",
              devServerStatus.status === 'ready' && "bg-green-500/20 text-green-300 border-green-500/30",
              devServerStatus.status === 'building' && "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
              devServerStatus.status === 'error' && "bg-red-500/20 text-red-300 border-red-500/30",
              devServerStatus.status === 'idle' && "bg-white/10 text-white/60"
            )}
          >
            {devServerStatus.status === 'ready' && <CheckCircle className="w-3 h-3 mr-1" />}
            {devServerStatus.status === 'building' && <Zap className="w-3 h-3 mr-1 animate-pulse" />}
            {devServerStatus.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
            {devServerStatus.message}
          </Badge>
          {platform === 'web' && (
            <span className="text-xs text-white/40">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport size selector */}
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

          {/* Console toggle */}
          {platform === 'web' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConsole(!showConsole)}
              className="text-white/60 hover:text-white hover:bg-white/10"
              title="Toggle Console"
            >
              {showConsole ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-white/60 hover:text-white hover:bg-white/10"
            title="Refresh Preview"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>

          {/* Fullscreen */}
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
        {/* Preview area */}
        <div className="flex-1 flex flex-col">
          {platform === 'web' ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
              {previewError ? (
                <Card className="bg-red-500/10 border-red-500/30 p-8">
                  <div className="flex flex-col items-center text-center">
                    <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-medium text-red-400 mb-2">Preview Error</h3>
                    <p className="text-red-300 text-sm mb-4">{previewError}</p>
                    <Button onClick={handleRefresh} variant="outline" className="border-red-400 text-red-400">
                      Try Again
                    </Button>
                  </div>
                </Card>
              ) : (
                <div 
                  className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
                  style={{
                    width: viewportConfigs[viewportSize].width,
                    height: viewportConfigs[viewportSize].height,
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                >
                  {isLoading && (
                    <div className="flex items-center justify-center h-full bg-white">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <span className="text-sm text-gray-600">Building preview...</span>
                      </div>
                    </div>
                  )}
                  {buildDevServerHTML && (
                    <iframe
                      ref={iframeRef}
                      srcDoc={buildDevServerHTML}
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

        {/* Console & Network panel */}
        {platform === 'web' && showConsole && (
          <div className="w-96 border-l border-white/10 bg-black/50 flex flex-col">
            <Tabs defaultValue="console" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 border-b border-white/10 rounded-none">
                <TabsTrigger value="console" className="data-[state=active]:bg-white/10">
                  <TerminalIcon className="w-4 h-4 mr-2" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="network" className="data-[state=active]:bg-white/10">
                  <Globe className="w-4 h-4 mr-2" />
                  Network
                </TabsTrigger>
              </TabsList>

              <TabsContent value="console" className="flex-1 overflow-y-auto p-3 space-y-1 m-0">
                {consoleMessages.length === 0 ? (
                  <div className="text-white/40 text-xs">No console messages</div>
                ) : (
                  consoleMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-xs font-mono p-1 rounded",
                        msg.type === 'error' && "text-red-300 bg-red-500/10",
                        msg.type === 'warn' && "text-yellow-300 bg-yellow-500/10",
                        msg.type === 'info' && "text-blue-300 bg-blue-500/10",
                        msg.type === 'log' && "text-white/70"
                      )}
                    >
                      <span className="text-white/40 mr-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      {msg.message}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="network" className="flex-1 overflow-y-auto p-3 space-y-1 m-0">
                {networkRequests.length === 0 ? (
                  <div className="text-white/40 text-xs">No network requests</div>
                ) : (
                  networkRequests.map((req, index) => (
                    <div key={index} className="text-xs p-2 rounded bg-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            req.status >= 200 && req.status < 300 && "bg-green-500/20 text-green-300",
                            req.status >= 300 && req.status < 400 && "bg-blue-500/20 text-blue-300",
                            req.status >= 400 && "bg-red-500/20 text-red-300"
                          )}
                        >
                          {req.status}
                        </Badge>
                        <span className="text-white/40">{req.time}ms</span>
                      </div>
                      <div className="text-white/70 truncate">{req.url}</div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>

            <div className="p-2 border-t border-white/10">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConsoleMessages([]);
                  setNetworkRequests([]);
                }}
                className="w-full text-white/60 hover:text-white hover:bg-white/10"
              >
                Clear All
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
          {platform === 'web' && devServerStatus.status === 'ready' && (
            <span className="text-green-300">● Live</span>
          )}
          {platform !== 'web' && (
            <span className="text-blue-300">Hardware Project</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedLivePreview;