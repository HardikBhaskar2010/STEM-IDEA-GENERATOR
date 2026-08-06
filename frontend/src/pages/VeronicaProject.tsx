import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import EnhancedCodeEditor from '@/components/EnhancedCodeEditor';
import {
  downloadVeronicaProjectZip,
  getVeronicaProject,
  updateVeronicaProjectFile,
  startVeronicaRun,
  stopVeronicaRun,
  getVeronicaRunLogs,
  runVeronicaSelfFix,
} from '@/services/veronicaAIService';
import { ArrowLeft, Download, Play, Square, Terminal, Wrench } from 'lucide-react';
import { trackEvent } from '@/lib/posthog';

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
  const [runId, setRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fixes, setFixes] = useState<string[]>([]);
  const [isFixing, setIsFixing] = useState(false);

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

  useEffect(() => {
    if (!id || !runId || !isRunning) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const logRes = await getVeronicaRunLogs(id, runId);
        if (!cancelled) setLogs(logRes.logs);
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, runId, isRunning]);

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
      trackEvent('veronica_project_downloaded', { download_format: 'zip' });
    } finally {
      setIsDownloading(false);
    }
  };

  const firstInoFile = useMemo(
    () => spec?.files?.find((f) => f.path.toLowerCase().endsWith('.ino')),
    [spec?.files]
  );

  const handleDownloadIno = () => {
    if (!firstInoFile) return;
    const blob = new Blob([firstInoFile.content || ''], { type: 'text/x-arduino' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = firstInoFile.path.split('/').pop() || 'sketch.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackEvent('veronica_project_downloaded', { download_format: 'ino' });
  };

  const handleRun = async () => {
    if (!id || isRunning) return;
    try {
      setIsRunning(true);
      const res = await startVeronicaRun(id);
      setRunId(res.run_id);
      setPreviewUrl(res.preview_url ?? null);
      trackEvent('veronica_run_started', { platform: spec?.platform });
      toast({ title: 'Run started', description: 'Sandbox run has been started.' });
      // Fetch initial logs (stubbed for now)
      const logRes = await getVeronicaRunLogs(id, res.run_id);
      setLogs(logRes.logs);
    } catch (e) {
      setIsRunning(false);
      setPreviewUrl(null);
      toast({
        title: 'Run failed',
        description: e instanceof Error ? e.message : 'Unable to start run.',
        variant: 'destructive',
      });
    }
  };

  const handleStop = async () => {
    if (!id || !runId) return;
    try {
      await stopVeronicaRun(id, runId);
      setIsRunning(false);
      setPreviewUrl(null);
      trackEvent('veronica_run_stopped', { platform: spec?.platform });
      toast({ title: 'Run stopped', description: 'Sandbox run has been stopped.' });
    } catch (e) {
      toast({
        title: 'Stop failed',
        description: e instanceof Error ? e.message : 'Unable to stop run.',
        variant: 'destructive',
      });
    }
  };

  const handleSelfFix = async () => {
    if (!id || !runId || isFixing) return;
    setIsFixing(true);
    try {
      const res = await runVeronicaSelfFix(id, runId);
      const lines: string[] = [];
      res.attempts.forEach((a) => {
        if (a.applied_fix) {
          lines.push(`Attempt ${a.attempt}: applied fix ${JSON.stringify(a.applied_fix)}`);
        } else if (a.error_kind) {
          lines.push(`Attempt ${a.attempt}: error ${a.error_kind}`);
        }
      });
      setFixes(lines);
      trackEvent('veronica_self_fix_completed', {
        attempts: res.attempts.length,
        fixes_applied: res.attempts.filter((attempt) => Boolean(attempt.applied_fix)).length,
      });
      toast({ title: 'Self-fix finished', description: 'Review logs and applied fixes below.' });
    } catch (e) {
      toast({
        title: 'Self-fix failed',
        description: e instanceof Error ? e.message : 'Unable to run self-fix.',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
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
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRun}
                disabled={!id || isRunning}
                variant="outline"
                className="border-green-500/40 text-green-500"
              >
                <Play className="w-4 h-4 mr-2" />
                Run
              </Button>
              <Button
                onClick={handleStop}
                disabled={!id || !runId}
                variant="outline"
                className="border-red-500/40 text-red-500"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
              <Button
                onClick={handleSelfFix}
                disabled={!id || !runId || isFixing}
                variant="outline"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {isFixing ? 'Fixing…' : 'Self-fix'}
              </Button>
              {firstInoFile && (
                <Button onClick={handleDownloadIno} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download .ino
                </Button>
              )}
              <Button onClick={handleDownloadZip} disabled={!id || isDownloading} className="bg-gradient-primary text-white">
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading…' : 'Download ZIP'}
              </Button>
            </div>
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

          {spec?.platform === 'web' && previewUrl && (
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-12 glass-effect border-primary/10 overflow-hidden">
                <div className="p-4 border-b border-primary/10 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Live Preview</div>
                  <Badge variant="outline" className="bg-background/40">
                    {isRunning ? 'running' : 'stopped'}
                  </Badge>
                </div>
                <div className="h-[420px] bg-black/20">
                  <iframe
                    src={previewUrl}
                    title="Veronica Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
                  />
                </div>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-12 glass-effect border-primary/10 overflow-hidden">
              <div className="p-4 border-b border-primary/10 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <div className="text-sm font-semibold">Run Logs</div>
              </div>
              <ScrollArea className="h-40">
                <pre className="p-4 text-xs whitespace-pre-wrap">
                  {logs || 'Run logs will appear here once available.'}
                </pre>
              </ScrollArea>
            </Card>
            <Card className="col-span-12 glass-effect border-primary/10 overflow-hidden">
              <div className="p-4 border-b border-primary/10 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                <div className="text-sm font-semibold">Applied Fixes</div>
              </div>
              <ScrollArea className="h-32">
                <div className="p-4 text-xs space-y-2">
                  {fixes.length ? fixes.map((x, i) => <div key={i}>{x}</div>) : <div>No fixes applied yet.</div>}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VeronicaProject;

