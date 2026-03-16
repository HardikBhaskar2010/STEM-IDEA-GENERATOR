import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import EnhancedCodeEditor from '@/components/EnhancedCodeEditor';
import { downloadVeronicaProjectZip, getVeronicaProject, updateVeronicaProjectFile } from '@/services/veronicaAIService';
import { ArrowLeft, Download } from 'lucide-react';

type ProjectFile = {
  path: string;
  content: string;
  description?: string | null;
  is_main?: boolean;
};

type ProjectSpec = {
  project_id: string;
  title: string;
  platform: string;
  difficulty: string;
  summary: string;
  learning_goals?: string[];
  steps?: string[];
  materials?: string[];
  wiring?: { overview?: string; connections?: string[]; notes?: string[] };
  files?: ProjectFile[];
  readme?: string;
};

type EditorFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content: string;
  description?: string;
  size_bytes: number;
  is_main_file: boolean;
};

const basename = (p: string) => (p.split('/').pop() || p).trim();
const ext = (p: string) => {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i >= 0 ? b.slice(i + 1) : 'txt';
};

const VeronicaProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spec, setSpec] = useState<ProjectSpec | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      try {
        const s = (await getVeronicaProject(id)) as ProjectSpec;
        setSpec(s);
        const main = (s.files || []).find((f) => f.is_main)?.path;
        setSelectedPath(main || (s.files?.[0]?.path ?? null));
      } catch (e) {
        toast({
          title: 'Failed to load project',
          description: e instanceof Error ? e.message : 'Project could not be loaded.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const editorFiles: EditorFile[] = useMemo(() => {
    const files = spec?.files ?? [];
    return files.map((f) => ({
      id: `vf_${spec?.project_id ?? 'p'}_${f.path}`,
      file_name: basename(f.path),
      file_path: f.path,
      file_type: ext(f.path),
      content: f.content,
      description: f.description ?? undefined,
      size_bytes: (f.content || '').length,
      is_main_file: !!f.is_main,
    }));
  }, [spec]);

  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;
    return editorFiles.find((f) => f.file_path === selectedPath) ?? null;
  }, [editorFiles, selectedPath]);

  const handleSave = async (content: string) => {
    if (!id || !selectedFile) return;
    const path = selectedFile.file_path;
    await updateVeronicaProjectFile(id, path, content);
    setSpec((prev) => {
      if (!prev) return prev;
      const nextFiles = (prev.files || []).map((f) => (f.path === path ? { ...f, content } : f));
      return { ...prev, files: nextFiles };
    });
    toast({ title: 'Saved', description: `${path} updated.` });
  };

  const handleDownloadZip = async () => {
    if (!id || isDownloading) return;
    setIsDownloading(true);
    try {
      const zipBlob = await downloadVeronicaProjectZip(id);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(spec?.title || 'veronica_project').replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-16 pb-10">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold truncate">{spec?.title || 'Veronica Project'}</h1>
                  {spec?.platform && <Badge variant="outline">{spec.platform}</Badge>}
                  {spec?.difficulty && <Badge variant="secondary">{spec.difficulty}</Badge>}
                </div>
                {spec?.summary && <p className="text-sm text-muted-foreground line-clamp-2">{spec.summary}</p>}
              </div>
            </div>
            <Button onClick={handleDownloadZip} disabled={!id || isDownloading} className="bg-gradient-primary text-white">
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading…' : 'Download ZIP'}
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-12 md:col-span-4 glass-effect border-primary/10 overflow-hidden">
              <div className="p-4 border-b border-primary/10">
                <div className="text-sm font-semibold">Files</div>
                <div className="text-xs text-muted-foreground">
                  {isLoading ? 'Loading…' : `${editorFiles.length} file(s)`}
                </div>
              </div>
              <ScrollArea className="h-[65vh]">
                <div className="p-2 space-y-1">
                  {editorFiles.map((f) => (
                    <button
                      key={f.id}
                      className={[
                        'w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted transition',
                        selectedPath === f.file_path ? 'bg-muted' : '',
                      ].join(' ')}
                      onClick={() => setSelectedPath(f.file_path)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{f.file_path}</span>
                        {f.is_main_file && (
                          <Badge variant="outline" className="shrink-0">
                            main
                          </Badge>
                        )}
                      </div>
                      {f.description && <div className="text-xs text-muted-foreground line-clamp-1">{f.description}</div>}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <Card className="col-span-12 md:col-span-8 glass-effect border-primary/10 overflow-hidden">
              <div className="p-4 border-b border-primary/10">
                <div className="text-sm font-semibold">{selectedFile ? selectedFile.file_path : 'Select a file'}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedFile ? `${selectedFile.size_bytes} chars` : 'Open a file to view/edit'}
                </div>
              </div>
              <div className="p-2">
                <EnhancedCodeEditor file={selectedFile as any} onSave={handleSave} readOnly={!selectedFile} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VeronicaProject;

