import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, 
  Download, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2,
  Search,
  Replace,
  Settings,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

interface CodeEditorProps {
  file: CodeFile | null;
  onSave?: (content: string) => void;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onSave,
  onContentChange,
  readOnly = false,
  className
}) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsModified(newContent !== originalContent);
    onContentChange?.(newContent);
  };

  // Handle save
  const handleSave = async () => {
    if (!file || !isModified || readOnly) return;

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
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!file || !content) return;

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

  // Handle search and replace
  const handleSearch = () => {
    if (!searchTerm || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const text = textarea.value;
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    
    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + searchTerm.length);
    }
  };

  const handleReplace = () => {
    if (!searchTerm || !textareaRef.current) return;

    const newContent = content.replace(new RegExp(searchTerm, 'gi'), replaceTerm);
    handleContentChange(newContent);
  };

  const handleReplaceAll = () => {
    if (!searchTerm || !textareaRef.current) return;

    const newContent = content.replace(new RegExp(searchTerm, 'gi'), replaceTerm);
    handleContentChange(newContent);
  };

  // Generate line numbers
  const generateLineNumbers = () => {
    const lines = content.split('\n');
    return lines.map((_, index) => (
      <div key={index} className="text-right text-white/40 select-none">
        {index + 1}
      </div>
    ));
  };

  // Get syntax highlighting class based on file type
  const getSyntaxClass = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'language-javascript';
      case 'py':
        return 'language-python';
      case 'cpp':
      case 'c':
      case 'h':
        return 'language-cpp';
      case 'html':
        return 'language-html';
      case 'css':
        return 'language-css';
      case 'json':
        return 'language-json';
      case 'md':
        return 'language-markdown';
      default:
        return 'language-text';
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'f':
            e.preventDefault();
            setShowSearch(!showSearch);
            break;
          case 'a':
            if (textareaRef.current) {
              e.preventDefault();
              textareaRef.current.select();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, handleSave]);

  if (!file) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-lg border border-white/10", className)}>
        <Eye className="w-12 h-12 text-white/20 mb-4" />
        <h3 className="text-lg font-medium text-white/60 mb-2">No File Selected</h3>
        <p className="text-sm text-white/40">
          Select a file from the tree to view and edit its contents.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", isFullscreen && "fixed inset-0 z-50 bg-black", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{file.file_name}</span>
            {isModified && (
              <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
                Modified
              </Badge>
            )}
            {file.is_main_file && (
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                Main
              </Badge>
            )}
          </div>
          {file.description && (
            <span className="text-sm text-white/60">- {file.description}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Search className="w-4 h-4" />
          </Button>

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
            <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="line-numbers" className="text-white text-sm">Line Numbers</Label>
                  <Switch
                    id="line-numbers"
                    checked={showLineNumbers}
                    onCheckedChange={setShowLineNumbers}
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="word-wrap" className="text-white text-sm">Word Wrap</Label>
                  <Switch
                    id="word-wrap"
                    checked={wordWrap}
                    onCheckedChange={setWordWrap}
                    size="sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="font-size" className="text-white text-sm">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    min="10"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-16 h-6 text-xs bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Copy className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
          </Button>

          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={!isModified || saveStatus === 'saving'}
              className="text-white/60 hover:text-white hover:bg-white/10"
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

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-white/5">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-white/5 border-white/10 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Input
            placeholder="Replace..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="flex-1 bg-white/5 border-white/10 text-white"
          />
          <Button size="sm" onClick={handleSearch} variant="outline" className="border-white/20">
            Find
          </Button>
          <Button size="sm" onClick={handleReplace} variant="outline" className="border-white/20">
            Replace
          </Button>
          <Button size="sm" onClick={handleReplaceAll} variant="outline" className="border-white/20">
            All
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className="flex flex-col p-4 pr-2 bg-white/5 border-r border-white/10 text-sm font-mono"
            style={{ fontSize: `${fontSize}px` }}
          >
            {generateLineNumbers()}
          </div>
        )}

        {/* Code content */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            readOnly={readOnly}
            className={cn(
              "w-full h-full p-4 bg-transparent text-white font-mono resize-none outline-none",
              "placeholder:text-white/40",
              getSyntaxClass(file.file_type),
              !wordWrap && "whitespace-nowrap overflow-x-auto"
            )}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: '1.5',
              tabSize: 2
            }}
            placeholder={readOnly ? "File content will appear here..." : "Start typing..."}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t border-white/10 bg-black/50 text-xs text-white/60">
        <div className="flex items-center gap-4">
          <span>Type: {file.file_type.toUpperCase()}</span>
          <span>Size: {file.size_bytes} bytes</span>
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {isModified && <span className="text-orange-300">Unsaved changes</span>}
          {readOnly && <span className="text-blue-300">Read-only</span>}
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;