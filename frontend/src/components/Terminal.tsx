import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { 
  X,
  Plus,
  Trash2,
  Download,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TerminalTab {
  id: string;
  name: string;
  terminal: XTerm;
  history: string[];
  historyIndex: number;
}

interface TerminalProps {
  className?: string;
  initialCommand?: string;
  onCommandExecute?: (command: string) => Promise<string>;
}

const Terminal: React.FC<TerminalProps> = ({
  className,
  initialCommand,
  onCommandExecute
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fittingRef = useRef<{ [key: string]: FitAddon }>({});

  // Create a new terminal tab
  const createTerminalTab = () => {
    const id = `term-${Date.now()}`;
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#a855f7',
        cursorAccent: '#000000',
        selection: 'rgba(168, 85, 247, 0.3)',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#ffffff',
        brightBlack: '#6b7280',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f9fafb'
      },
      scrollback: 1000,
      allowProposedApi: true
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    fittingRef.current[id] = fitAddon;

    const newTab: TerminalTab = {
      id,
      name: `Terminal ${tabs.length + 1}`,
      terminal,
      history: [],
      historyIndex: -1
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);

    return newTab;
  };

  // Initialize terminal
  useEffect(() => {
    if (tabs.length === 0) {
      createTerminalTab();
    }
  }, []);

  // Mount active terminal
  useEffect(() => {
    if (!activeTabId || !containerRef.current) return;

    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    const { terminal } = activeTab;
    const terminalContainer = containerRef.current;

    // Clear container
    terminalContainer.innerHTML = '';

    // Open terminal in container
    terminal.open(terminalContainer);

    // Fit terminal to container
    const fitAddon = fittingRef.current[activeTabId];
    if (fitAddon) {
      setTimeout(() => {
        fitAddon.fit();
      }, 0);
    }

    // Set up command handling
    let currentLine = '';
    const prompt = '\x1b[1;32m$\x1b[0m ';

    // Write welcome message
    if (terminal.buffer.active.length === 0) {
      terminal.writeln('\x1b[1;35m╔═══════════════════════════════════════════╗');
      terminal.writeln('║     Veronica AI Terminal Emulator        ║');
      terminal.writeln('║  Your Intelligent Coding Companion       ║');
      terminal.writeln('╚═══════════════════════════════════════════╝\x1b[0m');
      terminal.writeln('\x1b[2mType "help" for available commands\x1b[0m\n');
      terminal.write(prompt);
    }

    // Handle input
    const disposable = terminal.onData(async (data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        terminal.writeln('');
        
        if (currentLine.trim()) {
          // Add to history
          activeTab.history.push(currentLine);
          activeTab.historyIndex = activeTab.history.length;

          // Execute command
          await executeCommand(terminal, currentLine.trim());
        }

        currentLine = '';
        terminal.write(prompt);
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (code === 27) { // Escape sequences (arrow keys)
        // Handle arrow keys for history navigation
        if (data === '\x1b[A') { // Up arrow
          if (activeTab.historyIndex > 0) {
            // Clear current line
            for (let i = 0; i < currentLine.length; i++) {
              terminal.write('\b \b');
            }
            
            activeTab.historyIndex--;
            currentLine = activeTab.history[activeTab.historyIndex];
            terminal.write(currentLine);
          }
        } else if (data === '\x1b[B') { // Down arrow
          if (activeTab.historyIndex < activeTab.history.length - 1) {
            // Clear current line
            for (let i = 0; i < currentLine.length; i++) {
              terminal.write('\b \b');
            }
            
            activeTab.historyIndex++;
            currentLine = activeTab.history[activeTab.historyIndex];
            terminal.write(currentLine);
          } else if (activeTab.historyIndex === activeTab.history.length - 1) {
            // Clear current line
            for (let i = 0; i < currentLine.length; i++) {
              terminal.write('\b \b');
            }
            activeTab.historyIndex = activeTab.history.length;
            currentLine = '';
          }
        }
      } else if (code >= 32) { // Printable characters
        currentLine += data;
        terminal.write(data);
      }
    });

    // Execute initial command if provided
    if (initialCommand) {
      executeCommand(terminal, initialCommand);
    }

    // Handle resize
    const handleResize = () => {
      const fitAddon = fittingRef.current[activeTabId];
      if (fitAddon) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposable.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTabId, tabs]);

  // Execute command
  const executeCommand = async (terminal: XTerm, command: string) => {
    const [cmd, ...args] = command.split(' ');

    // Built-in commands
    switch (cmd.toLowerCase()) {
      case 'help':
        terminal.writeln('\x1b[1;36m╔═══════════════════════════════════════════╗');
        terminal.writeln('║         Available Commands                ║');
        terminal.writeln('╚═══════════════════════════════════════════╝\x1b[0m');
        terminal.writeln('');
        terminal.writeln('  \x1b[1;32mhelp\x1b[0m          - Show this help message');
        terminal.writeln('  \x1b[1;32mclear\x1b[0m         - Clear the terminal screen');
        terminal.writeln('  \x1b[1;32mecho\x1b[0m [text]   - Print text to terminal');
        terminal.writeln('  \x1b[1;32mdate\x1b[0m          - Show current date and time');
        terminal.writeln('  \x1b[1;32mpwd\x1b[0m           - Print working directory');
        terminal.writeln('  \x1b[1;32mls\x1b[0m            - List files (simulated)');
        terminal.writeln('  \x1b[1;32mnpm\x1b[0m [cmd]     - Simulate npm commands');
        terminal.writeln('  \x1b[1;32mnode\x1b[0m [file]   - Simulate node execution');
        terminal.writeln('  \x1b[1;32mgit\x1b[0m [cmd]     - Simulate git commands');
        terminal.writeln('  \x1b[1;32mveronica\x1b[0m      - Show Veronica AI info');
        terminal.writeln('');
        terminal.writeln('\x1b[2mTip: Use ↑/↓ arrow keys for command history\x1b[0m');
        break;

      case 'clear':
        terminal.clear();
        break;

      case 'echo':
        terminal.writeln(args.join(' '));
        break;

      case 'date':
        terminal.writeln(new Date().toString());
        break;

      case 'pwd':
        terminal.writeln('/workspace/project');
        break;

      case 'ls':
        terminal.writeln('\x1b[1;34msrc/\x1b[0m');
        terminal.writeln('\x1b[1;34mpublic/\x1b[0m');
        terminal.writeln('index.html');
        terminal.writeln('package.json');
        terminal.writeln('README.md');
        break;

      case 'npm':
        const npmCmd = args[0];
        if (npmCmd === 'install' || npmCmd === 'i') {
          terminal.writeln('\x1b[1;33m[NPM]\x1b[0m Installing dependencies...');
          await simulateDelay(terminal, 1000);
          terminal.writeln('\x1b[1;32m✓\x1b[0m Dependencies installed successfully');
        } else if (npmCmd === 'run') {
          const script = args[1];
          terminal.writeln(`\x1b[1;33m[NPM]\x1b[0m Running script: ${script}`);
          await simulateDelay(terminal, 500);
          terminal.writeln('\x1b[1;32m✓\x1b[0m Script executed');
        } else {
          terminal.writeln(`npm ${args.join(' ')}`);
        }
        break;

      case 'node':
        const file = args[0] || 'index.js';
        terminal.writeln(`\x1b[1;32m[Node.js]\x1b[0m Executing ${file}...`);
        await simulateDelay(terminal, 500);
        terminal.writeln('Hello from Node.js!');
        break;

      case 'git':
        const gitCmd = args[0];
        if (gitCmd === 'status') {
          terminal.writeln('On branch main');
          terminal.writeln('Your branch is up to date with \'origin/main\'.');
          terminal.writeln('nothing to commit, working tree clean');
        } else if (gitCmd === 'log') {
          terminal.writeln('\x1b[1;33mcommit abc123\x1b[0m');
          terminal.writeln('Author: Developer <dev@example.com>');
          terminal.writeln('Date:   ' + new Date().toDateString());
          terminal.writeln('    Initial commit');
        } else {
          terminal.writeln(`git ${args.join(' ')}`);
        }
        break;

      case 'veronica':
        terminal.writeln('\x1b[1;35m');
        terminal.writeln('╔════════════════════════════════════════╗');
        terminal.writeln('║        Veronica AI Terminal            ║');
        terminal.writeln('║  Your Intelligent Coding Companion     ║');
        terminal.writeln('╚════════════════════════════════════════╝');
        terminal.writeln('\x1b[0m');
        terminal.writeln('Version: 1.0.0');
        terminal.writeln('Status: \x1b[1;32m●\x1b[0m Online');
        break;

      default:
        if (onCommandExecute) {
          try {
            const result = await onCommandExecute(command);
            terminal.writeln(result);
          } catch (error) {
            terminal.writeln(`\x1b[1;31mError:\x1b[0m ${error}`);
          }
        } else {
          terminal.writeln(`\x1b[1;31mCommand not found:\x1b[0m ${cmd}`);
          terminal.writeln('Type "help" for available commands');
        }
        break;
    }
  };

  // Simulate delay for animations
  const simulateDelay = (terminal: XTerm, ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Close terminal tab
  const closeTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      tab.terminal.dispose();
      delete fittingRef.current[tabId];
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));

    if (activeTabId === tabId && tabs.length > 1) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remainingTabs[0].id);
    }
  };

  // Clear active terminal
  const clearTerminal = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.terminal.clear();
    }
  };

  // Download terminal output
  const downloadOutput = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      const content = activeTab.terminal.buffer.active.getLine(0)?.translateToString() || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-black",
      isFullscreen && "fixed inset-0 z-50",
      className
    )}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/50">
        <div className="flex items-center flex-1 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 border-r border-white/10 cursor-pointer transition-colors min-w-fit",
                activeTabId === tab.id
                  ? "bg-black text-white"
                  : "bg-black/30 text-white/60 hover:bg-black/50 hover:text-white"
              )}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="text-sm">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={createTerminalTab}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            className="text-white/60 hover:text-white hover:bg-white/10"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadOutput}
            className="text-white/60 hover:text-white hover:bg-white/10"
            title="Download output"
          >
            <Download className="w-4 h-4" />
          </Button>
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

      {/* Terminal container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden p-2"
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-white/10 bg-black/50 text-xs text-white/60">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
            ● Ready
          </Badge>
          <span>Shell: Bash</span>
          <span>Tabs: {tabs.length}</span>
        </div>
        <div>
          Veronica AI Terminal v1.0
        </div>
      </div>
    </div>
  );
};

export default Terminal;