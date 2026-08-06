import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileCode2, FolderOpen, Folder, ChevronRight, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProjectFile {
  path: string;
  content: string;
  description?: string;
  is_main?: boolean;
}

interface AgentBuildPanelProps {
  project: {
    project_id: string;
    title: string;
    summary: string;
    platform: string;
    difficulty: string;
    files: ProjectFile[];
    readme?: string;
  };
  onRun?: (projectId: string) => void;
  onDownload?: (projectId: string) => void;
  isRunning?: boolean;
  className?: string;
}

// Build a tree from flat file paths
function buildTree(files: ProjectFile[]): Record<string, any> {
  const tree: Record<string, any> = {};
  for (const f of files) {
    const parts = f.path.split('/');
    let cur = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || { __dir: true, __children: {} };
      cur = cur[parts[i]].__children;
    }
    cur[parts[parts.length - 1]] = { __file: true, __data: f };
  }
  return tree;
}

function getFileIcon(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.jsx')) {return '⚛';}
  if (name.endsWith('.ts') || name.endsWith('.js')) {return '📜';}
  if (name.endsWith('.css')) {return '🎨';}
  if (name.endsWith('.html')) {return '🌐';}
  if (name.endsWith('.json')) {return '{}';}
  if (name.endsWith('.md')) {return '📝';}
  if (name.endsWith('.ino')) {return '🔌';}
  if (name.endsWith('.py')) {return '🐍';}
  return '📄';
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop() || '';
  const map: Record<string, string> = {
    tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
    py: 'python', ino: 'cpp', cpp: 'cpp', c: 'c',
  };
  return map[ext] || 'text';
}

interface TreeNodeProps {
  name: string;
  node: any;
  depth?: number;
  selectedPath: string | null;
  onSelect: (file: ProjectFile) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, node, depth = 0, selectedPath, onSelect }) => {
  const [open, setOpen] = useState(depth < 2);

  if (node.__file) {
    const f: ProjectFile = node.__data;
    return (
      <button
        onClick={() => onSelect(f)}
        className={cn(
          'w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs transition-all',
          selectedPath === f.path
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
        )}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        <span className="text-[11px]">{getFileIcon(name)}</span>
        <span className="truncate">{name}</span>
        {f.is_main && (
          <span className="ml-auto text-[9px] px-1 rounded bg-primary/20 text-primary">main</span>
        )}
      </button>
    );
  }

  if (node.__dir) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <ChevronRight className={cn('w-3 h-3 transition-transform shrink-0', open && 'rotate-90')} />
          {open ? <FolderOpen className="w-3 h-3 text-amber-400 shrink-0" /> : <Folder className="w-3 h-3 text-amber-400 shrink-0" />}
          <span>{name}</span>
        </button>
        {open && Object.entries(node.__children).map(([childName, childNode]) => (
          <TreeNode
            key={childName}
            name={childName}
            node={childNode}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return null;
};

export const AgentBuildPanel: React.FC<AgentBuildPanelProps> = ({
  project,
  onRun,
  onDownload,
  isRunning = false,
  className,
}) => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(
    project.files.find(f => f.is_main) || project.files[0] || null
  );
  const [showReadme, setShowReadme] = useState(false);

  const tree = buildTree(project.files);

  return (
    <div className={cn('flex rounded-2xl border border-primary/20 overflow-hidden bg-black/30 backdrop-blur-xl', className)}>
      {/* File tree sidebar */}
      <div className="w-52 shrink-0 border-r border-primary/10 flex flex-col" style={{ minWidth: '180px', maxWidth: '220px' }}>
        {/* Project header */}
        <div className="px-3 py-2.5 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{project.title}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] px-1.5 py-0 rounded-full bg-primary/10 text-primary">
              {project.platform}
            </span>
            <span className="text-[10px] text-muted-foreground">{project.difficulty}</span>
          </div>
        </div>

        {/* README button */}
        {project.readme && (
          <button
            onClick={() => { setShowReadme(true); setSelectedFile(null); }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-xs transition',
              showReadme ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <span className="text-[11px]">📝</span> README.md
          </button>
        )}

        {/* File tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {Object.entries(tree).map(([name, node]) => (
            <TreeNode
              key={name}
              name={name}
              node={node}
              selectedPath={selectedFile?.path || null}
              onSelect={(f) => { setSelectedFile(f); setShowReadme(false); }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="p-2 border-t border-primary/10 flex flex-col gap-1.5">
          {onRun && project.platform === 'web' && (
            <Button
              size="sm"
              className="w-full h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => onRun(project.project_id)}
              disabled={isRunning}
            >
              <Play className="w-3 h-3" />
              {isRunning ? 'Running…' : 'Run on E2B'}
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs gap-1.5 border-primary/20"
              onClick={() => onDownload(project.project_id)}
            >
              <Download className="w-3 h-3" />
              Download ZIP
            </Button>
          )}
        </div>
      </div>

      {/* Code viewer */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Tab bar */}
        {(selectedFile || showReadme) && (
          <div className="flex items-center gap-0 border-b border-primary/10 px-2 bg-black/20">
            {showReadme && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 border-primary text-primary">
                <span>📝</span> README.md
              </div>
            )}
            {selectedFile && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 border-primary text-primary">
                <span>{getFileIcon(selectedFile.path)}</span>
                {selectedFile.path.split('/').pop()}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto" style={{ maxHeight: '520px' }}>
          {showReadme && project.readme ? (
            <div className="prose prose-invert prose-sm max-w-none p-5 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.readme}
              </ReactMarkdown>
            </div>
          ) : selectedFile ? (
            <pre className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto leading-5">
              <code>{selectedFile.content}</code>
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a file to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
