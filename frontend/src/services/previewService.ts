import type { CodeFile } from './codeGenerationService';

// Types
export interface PreviewOptions {
  autoRefresh?: boolean;
  refreshDelay?: number;
  sandboxed?: boolean;
  enableConsole?: boolean;
  viewport?: ViewportSize;
}

export interface PreviewContent {
  html: string;
  css: string;
  javascript: string;
  hasErrors: boolean;
  errors: PreviewError[];
  warnings: PreviewWarning[];
}

export interface PreviewError {
  type: 'syntax' | 'runtime' | 'security';
  message: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface PreviewWarning {
  type: 'performance' | 'accessibility' | 'compatibility';
  message: string;
  suggestion?: string;
}

export interface ViewportSize {
  width: number | string;
  height: number | string;
  name: string;
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: Date;
  args?: any[];
}

export interface PreviewState {
  isLoading: boolean;
  hasContent: boolean;
  lastUpdated: Date;
  errors: PreviewError[];
  warnings: PreviewWarning[];
  consoleMessages: ConsoleMessage[];
}

class PreviewService {
  private previewCache: Map<string, PreviewContent> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private consoleCapture: Map<string, ConsoleMessage[]> = new Map();
  
  // Predefined viewport sizes
  public readonly viewportSizes: Record<string, ViewportSize> = {
    desktop: { width: '100%', height: '100%', name: 'Desktop' },
    tablet: { width: '768px', height: '1024px', name: 'Tablet' },
    mobile: { width: '375px', height: '667px', name: 'Mobile' },
    wide: { width: '1920px', height: '1080px', name: 'Wide Screen' }
  };

  private defaultOptions: PreviewOptions = {
    autoRefresh: true,
    refreshDelay: 500,
    sandboxed: true,
    enableConsole: true,
    viewport: this.viewportSizes.desktop
  };

  /**
   * Generate preview HTML from code files
   */
  generatePreview(
    files: CodeFile[], 
    platform: string,
    options: PreviewOptions = {}
  ): PreviewContent {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    if (platform !== 'web') {
      return this.generateNonWebPreview(files, platform);
    }

    const htmlFiles = files.filter(f => f.file_type === 'html' || f.file_name.endsWith('.html'));
    const cssFiles = files.filter(f => f.file_type === 'css' || f.file_name.endsWith('.css'));
    const jsFiles = files.filter(f => f.file_type === 'js' || f.file_name.endsWith('.js'));
    const tsFiles = files.filter(f => f.file_type === 'ts' || f.file_name.endsWith('.ts'));
    const jsxFiles = files.filter(f => f.file_type === 'jsx' || f.file_name.endsWith('.jsx'));
    const tsxFiles = files.filter(f => f.file_type === 'tsx' || f.file_name.endsWith('.tsx'));

    const previewContent: PreviewContent = {
      html: '',
      css: '',
      javascript: '',
      hasErrors: false,
      errors: [],
      warnings: []
    };

    try {
      // Generate HTML
      previewContent.html = this.generateHTML(htmlFiles, jsxFiles, tsxFiles);
      
      // Combine CSS
      previewContent.css = this.combineCSS(cssFiles);
      
      // Combine and process JavaScript
      previewContent.javascript = this.combineJavaScript(jsFiles, tsFiles, jsxFiles, tsxFiles);
      
      // Validate content
      this.validatePreviewContent(previewContent);
      
      // Generate final HTML document
      const finalHtml = this.buildFinalHTML(previewContent, mergedOptions);
      previewContent.html = finalHtml;

    } catch (error) {
      previewContent.hasErrors = true;
      previewContent.errors.push({
        type: 'runtime',
        message: `Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return previewContent;
  }

  /**
   * Generate preview for non-web platforms
   */
  private generateNonWebPreview(files: CodeFile[], platform: string): PreviewContent {
    const platformInfo = this.getPlatformInfo(platform);
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${platformInfo.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 2rem;
          }
          .title {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 300;
          }
          .description {
            font-size: 1.2rem;
            margin-bottom: 3rem;
            opacity: 0.9;
            line-height: 1.6;
          }
          .instructions {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 3rem;
            backdrop-filter: blur(10px);
          }
          .instructions h3 {
            margin-top: 0;
            font-size: 1.5rem;
          }
          .step {
            display: flex;
            align-items: center;
            margin: 1rem 0;
            text-align: left;
          }
          .step-number {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            font-weight: bold;
          }
          .files {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
          }
          .file {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 1rem;
            backdrop-filter: blur(5px);
          }
          .file-name {
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .file-type {
            opacity: 0.7;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${platformInfo.icon}</div>
          <h1 class="title">${platformInfo.title}</h1>
          <p class="description">${platformInfo.description}</p>
          
          <div class="instructions">
            <h3>Setup Instructions</h3>
            ${platformInfo.instructions.map((instruction, index) => `
              <div class="step">
                <div class="step-number">${index + 1}</div>
                <div>${instruction}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="files">
            ${files.map(file => `
              <div class="file">
                <div class="file-name">${file.file_name}</div>
                <div class="file-type">${file.file_type.toUpperCase()}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      html,
      css: '',
      javascript: '',
      hasErrors: false,
      errors: [],
      warnings: []
    };
  }

  /**
   * Generate HTML content
   */
  private generateHTML(htmlFiles: CodeFile[], jsxFiles: CodeFile[], tsxFiles: CodeFile[]): string {
    if (htmlFiles.length > 0) {
      // Use existing HTML file
      const mainHtml = htmlFiles.find(f => f.is_main_file) || htmlFiles[0];
      return mainHtml.content;
    }

    if (jsxFiles.length > 0 || tsxFiles.length > 0) {
      // Generate HTML for React components
      return this.generateReactHTML(jsxFiles, tsxFiles);
    }

    // Generate basic HTML structure
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated Project</title>
      </head>
      <body>
        <div id="root">
          <h1>Generated Project</h1>
          <p>This is a preview of your generated project.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for React components
   */
  private generateReactHTML(jsxFiles: CodeFile[], tsxFiles: CodeFile[]): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>React Component Preview</title>
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <div style="padding: 20px; text-align: center; color: #666; margin-top: 20px;">
          <h3>React Component Preview</h3>
          <p>This is a preview of your React components. Full functionality may require a proper build setup.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Combine CSS files
   */
  private combineCSS(cssFiles: CodeFile[]): string {
    return cssFiles.map(file => `/* ${file.file_name} */\n${file.content}`).join('\n\n');
  }

  /**
   * Combine JavaScript files
   */
  private combineJavaScript(
    jsFiles: CodeFile[], 
    tsFiles: CodeFile[], 
    jsxFiles: CodeFile[], 
    tsxFiles: CodeFile[]
  ): string {
    const allFiles = [...jsFiles, ...tsFiles, ...jsxFiles, ...tsxFiles];
    return allFiles.map(file => `/* ${file.file_name} */\n${file.content}`).join('\n\n');
  }

  /**
   * Build final HTML document
   */
  private buildFinalHTML(content: PreviewContent, options: PreviewOptions): string {
    let html = content.html;

    // Inject CSS
    if (content.css) {
      const cssTag = `<style>\n${content.css}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${cssTag}\n</head>`);
      } else {
        html = `${cssTag}\n${html}`;
      }
    }

    // Inject JavaScript
    if (content.javascript) {
      const jsTag = `<script>\n${content.javascript}\n</script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${jsTag}\n</body>`);
      } else {
        html = `${html}\n${jsTag}`;
      }
    }

    // Add console capture if enabled
    if (options.enableConsole) {
      const consoleScript = this.generateConsoleScript();
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${consoleScript}\n</head>`);
      } else {
        html = `${consoleScript}\n${html}`;
      }
    }

    return html;
  }

  /**
   * Generate console capture script
   */
  private generateConsoleScript(): string {
    return `
      <script>
        (function() {
          const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
          };
          
          function captureConsole(type, args) {
            // Send to parent window if in iframe
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'console',
                level: type,
                message: Array.from(args).join(' '),
                timestamp: new Date().toISOString()
              }, '*');
            }
            
            // Call original console method
            originalConsole[type].apply(console, args);
          }
          
          console.log = function() { captureConsole('log', arguments); };
          console.warn = function() { captureConsole('warn', arguments); };
          console.error = function() { captureConsole('error', arguments); };
          console.info = function() { captureConsole('info', arguments); };
          
          // Capture errors
          window.addEventListener('error', function(event) {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'console',
                level: 'error',
                message: event.error ? event.error.message : 'Unknown error',
                timestamp: new Date().toISOString()
              }, '*');
            }
          });
        })();
      </script>
    `;
  }

  /**
   * Validate preview content
   */
  private validatePreviewContent(content: PreviewContent): void {
    // Check for potential security issues
    const securityPatterns = [
      /eval\s*\(/gi,
      /innerHTML\s*=/gi,
      /document\.write/gi,
      /script\s*src\s*=\s*["'][^"']*["']/gi
    ];

    securityPatterns.forEach(pattern => {
      if (pattern.test(content.javascript) || pattern.test(content.html)) {
        content.warnings.push({
          type: 'security',
          message: 'Potentially unsafe code detected',
          suggestion: 'Review code for security vulnerabilities'
        });
      }
    });

    // Check for performance issues
    if (content.css.length > 50000) {
      content.warnings.push({
        type: 'performance',
        message: 'Large CSS file detected',
        suggestion: 'Consider optimizing CSS for better performance'
      });
    }

    if (content.javascript.length > 100000) {
      content.warnings.push({
        type: 'performance',
        message: 'Large JavaScript file detected',
        suggestion: 'Consider code splitting for better performance'
      });
    }
  }

  /**
   * Get platform information
   */
  private getPlatformInfo(platform: string) {
    const platformData = {
      arduino: {
        icon: '🔧',
        title: 'Arduino Project',
        description: 'This Arduino project contains microcontroller code that runs on hardware.',
        instructions: [
          'Open the .ino file in Arduino IDE',
          'Connect your Arduino board via USB',
          'Select the correct board and port in Tools menu',
          'Click the upload button to flash code to your device'
        ]
      },
      raspberry_pi: {
        icon: '🍓',
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
        icon: '📱',
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

    return platformData[platform as keyof typeof platformData] || {
      icon: '💻',
      title: 'Code Project',
      description: 'This project contains generated code files.',
      instructions: ['Review the generated files', 'Follow platform-specific setup instructions']
    };
  }

  /**
   * Setup auto-refresh for preview
   */
  setupAutoRefresh(
    previewId: string,
    files: CodeFile[],
    platform: string,
    onUpdate: (content: PreviewContent) => void,
    options: PreviewOptions = {}
  ): void {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    if (!mergedOptions.autoRefresh) {
      return;
    }

    // Clear existing timer
    const existingTimer = this.refreshTimers.get(previewId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up new timer
    const timer = setTimeout(() => {
      const updatedContent = this.generatePreview(files, platform, options);
      onUpdate(updatedContent);
    }, mergedOptions.refreshDelay);

    this.refreshTimers.set(previewId, timer);
  }

  /**
   * Clear auto-refresh timer
   */
  clearAutoRefresh(previewId: string): void {
    const timer = this.refreshTimers.get(previewId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(previewId);
    }
  }

  /**
   * Handle console messages from iframe
   */
  handleConsoleMessage(previewId: string, message: any): void {
    if (message.type === 'console') {
      const consoleMessage: ConsoleMessage = {
        type: message.level,
        message: message.message,
        timestamp: new Date(message.timestamp)
      };

      const messages = this.consoleCapture.get(previewId) || [];
      messages.push(consoleMessage);
      
      // Keep only last 100 messages
      if (messages.length > 100) {
        messages.shift();
      }
      
      this.consoleCapture.set(previewId, messages);
    }
  }

  /**
   * Get console messages for preview
   */
  getConsoleMessages(previewId: string): ConsoleMessage[] {
    return this.consoleCapture.get(previewId) || [];
  }

  /**
   * Clear console messages
   */
  clearConsoleMessages(previewId: string): void {
    this.consoleCapture.set(previewId, []);
  }

  /**
   * Check if platform supports live preview
   */
  supportsLivePreview(platform: string): boolean {
    return platform === 'web';
  }

  /**
   * Get recommended viewport for platform
   */
  getRecommendedViewport(platform: string): ViewportSize {
    switch (platform) {
      case 'mobile':
        return this.viewportSizes.mobile;
      case 'web':
        return this.viewportSizes.desktop;
      default:
        return this.viewportSizes.desktop;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all timers
    this.refreshTimers.forEach(timer => clearTimeout(timer));
    this.refreshTimers.clear();
    
    // Clear cache
    this.previewCache.clear();
    this.consoleCapture.clear();
  }
}

// Export singleton instance
export const previewService = new PreviewService();
export default previewService;