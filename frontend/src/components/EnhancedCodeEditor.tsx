import React, { useRef, useState, useEffect } from 'react';
import type { Monaco } from '@monaco-editor/react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { 
  Copy, 
  Download, 
  Save, 
  Eye,
  Maximize2, 
  Minimize2,
  Settings,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
  is_modified?: boolean;
}

interface EnhancedCodeEditorProps {
  file: CodeFile | null;
  onSave?: (content: string) => void;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

const EnhancedCodeEditor: React.FC<EnhancedCodeEditorProps> = ({
  file,
  onSave,
  onContentChange,
  readOnly = false,
  className
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Editor settings
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('off');
  const [minimap, setMinimap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState<'on' | 'off' | 'relative'>('on');

  // Update content when file changes
  useEffect(() => {
    if (file) {
      setContent(file.content);
      setOriginalContent(file.content);
      setIsModified(false);
    } else {
      setContent('');
      setOriginalContent('');
      setIsModified(false);
    }
  }, [file]);

  // Handle editor mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure editor
    editor.updateOptions({
      fontSize,
      wordWrap,
      minimap: { enabled: minimap },
      lineNumbers,
      readOnly,
      automaticLayout: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: 'advanced',
      tabSize: 2,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on'
    });

    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Add format document command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });
  };

  // Handle content changes
  const handleContentChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setIsModified(newContent !== originalContent);
    onContentChange?.(newContent);
  };

  // Handle save
  const handleSave = async () => {
    if (!file || !isModified || readOnly) {return;}

    setSaveStatus('saving');
    try {
      await onSave?.(content);
      setOriginalContent(content);
      setIsModified(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!content) {return;}
    
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!file || !content) {return;}

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format document
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // Get language from file type
  const getLanguage = (fileType: string): string => {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'cpp',
      'ino': 'cpp',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'dart': 'dart',
      'java': 'java',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust'
    };

    return languageMap[fileType.toLowerCase()] || 'plaintext';
  };

  // Update editor options when settings change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize,
        wordWrap,
        minimap: { enabled: minimap },
        lineNumbers
      });
    }
  }, [fontSize, wordWrap, minimap, lineNumbers]);

  // Update theme
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme]);

  if (!file) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8 text-center bg-black/30 border border-white/10 rounded-lg", className)}>
        <Code2 className="w-16 h-16 text-white/20 mb-4" />
        <h3 className="text-xl font-semibold text-white/60 mb-2">No File Selected</h3>
        <p className="text-white/40 max-w-md">
          Select a file from the tree to view and edit its contents with Monaco Editor.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-white/50">
          <Lightbulb className="w-4 h-4" />
          <span>Pro tip: Use Ctrl+S to save, Ctrl+Shift+F to format</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", isFullscreen && "fixed inset-0 z-50 bg-black", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{file.file_name}</span>
            {isModified && (
              <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                Modified
              </Badge>
            )}
            {file.is_main_file && (
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                Main
              </Badge>
            )}
          </div>
          {file.description && (
            <span className="text-sm text-white/60">- {file.description}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 w-64">
              <div className="p-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Theme</Label>
                  <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                      <SelectItem value="vs-dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Font Size</Label>
                  <Input
                    type="number"
                    min="10"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Line Numbers</Label>
                  <Select value={lineNumbers} onValueChange={(value: any) => setLineNumbers(value)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                      <SelectItem value="on">On</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="relative">Relative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="word-wrap" className="text-white text-sm">Word Wrap</Label>
                  <Switch
                    id="word-wrap"
                    checked={wordWrap === 'on'}
                    onCheckedChange={(checked) => setWordWrap(checked ? 'on' : 'off')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="minimap" className="text-white text-sm">Minimap</Label>
                  <Switch
                    id="minimap"
                    checked={minimap}
                    onCheckedChange={setMinimap}
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Format button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            className="text-white/60 hover:text-white hover:bg-white/10"
            title="Format Document (Ctrl+Shift+F)"
          >
            <Code2 className="w-4 h-4" />
          </Button>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-white/60 hover:text-white hover:bg-white/10"
            title="Copy to Clipboard"
          >
            <Copy className="w-4 h-4" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white/60 hover:text-white hover:bg-white/10"
            title="Download File"
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Save button */}
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={!isModified || saveStatus === 'saving'}
              className="text-white/60 hover:text-white hover:bg-white/10"
              title="Save (Ctrl+S)"
            >
              {saveStatus === 'saving' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saveStatus === 'saved' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : saveStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          )}

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

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(file.file_type)}
          value={content}
          onChange={handleContentChange}
          onMount={handleEditorDidMount}
          theme={theme}
          options={{
            readOnly,
            fontSize,
            wordWrap,
            minimap: { enabled: minimap },
            lineNumbers,
            automaticLayout: true
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t border-white/10 bg-black/50 text-xs text-white/60">
        <div className="flex items-center gap-4">
          <span>Language: {getLanguage(file.file_type).toUpperCase()}</span>
          <span>Size: {file.size_bytes} bytes</span>
          <span>Lines: {content.split('\n').length}</span>
          <span>Length: {content.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {isModified && <span className="text-orange-300">Unsaved changes</span>}
          {readOnly && <span className="text-blue-300">Read-only</span>}
          <span>UTF-8</span>
          <span>Monaco Editor</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCodeEditor;