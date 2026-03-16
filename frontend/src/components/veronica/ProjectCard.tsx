import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { projectService } from '@/services/projectService';
import type { VeronicaAIAction } from '@/services/veronicaAIService';
import { downloadVeronicaProjectZip } from '@/services/veronicaAIService';
import { useNavigate } from 'react-router-dom';
import { Download, FolderOpen, Save, Code, Sparkles, Eye } from 'lucide-react';

type ProjectSpec = {
  project_id: string;
  title: string;
  summary: string;
  platform: string;
  difficulty: string;
  learning_goals?: string[];
  steps: string[];
  materials?: string[];
  wiring?: { overview?: string; connections?: string[]; notes?: string[] };
  files?: { path: string; content: string; description?: string | null; is_main?: boolean }[];
  readme?: string;
};

export function ProjectCard({
  project,
  actions,
  onActionsChange,
  defaultProjectType,
}: {
  project: ProjectSpec;
  actions: VeronicaAIAction[];
  onActionsChange: (next: VeronicaAIAction[]) => void;
  defaultProjectType?: string;
}) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const actionMap = useMemo(() => {
    const map = new Map<string, VeronicaAIAction>();
    actions.forEach((a) => map.set(a.type, a));
    return map;
  }, [actions]);

  const setActionEnabled = (type: string, enabled: boolean, id?: string | null) => {
    onActionsChange(
      actions.map((a) => (a.type === type ? { ...a, enabled, id: id ?? a.id } : a))
    );
  };

  const firstInoFile = useMemo(
    () => project.files?.find((f) => f.path.toLowerCase().endsWith('.ino')),
    [project.files]
  );

  const handleDownloadIno = () => {
    if (!firstInoFile) return;
    const blob = new Blob([firstInoFile.content || ''], { type: 'text/x-arduino' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = firstInoFile.path.split('/').pop() || 'sketch.ino';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Sketch downloaded',
      description: `${link.download} has been downloaded.`,
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await projectService.saveProject({
        title: project.title,
        description: project.summary,
        project_type: defaultProjectType || 'electronics',
        difficulty: project.difficulty,
        estimated_time: project.steps?.length ? `${project.steps.length * 30}–${project.steps.length * 60} min` : 'TBD',
        estimated_cost: 'TBD',
        components: project.materials ?? [],
        skills: project.learning_goals ?? [],
        steps: project.steps,
        generated_from_params: {
          projectType: defaultProjectType || 'electronics',
          skillLevel: project.difficulty,
          interests: project.summary,
          budget: '',
          duration: '',
        },
      });

      setSavedProjectId(saved.id);
      setActionEnabled('open_project', true, saved.id);
      toast({ title: 'Project saved', description: 'Saved to your library.' });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Could not save project.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpen = () => {
    const id = savedProjectId || actionMap.get('open_project')?.id;
    if (!id) return;
    navigate(`/veronica-project/${id}`);
  };

  const handleDownload = async () => {
    const id = actionMap.get('download_project')?.id || project.project_id;
    if (!id || isDownloading) return;
    setIsDownloading(true);
    try {
      const zipBlob = await downloadVeronicaProjectZip(id);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.title.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: 'Your ZIP is downloading.' });
    } catch (e) {
      toast({
        title: 'Download failed',
        description: e instanceof Error ? e.message : 'Could not download project ZIP.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleComingSoon = (label: string) => {
    toast({
      title: 'Not enabled yet',
      description: `${label} is wired in the backend, but the UI workflow will be enabled later.`,
    });
  };

  const orderedActionTypes = [
    'save_project',
    'open_project',
    'generate_code',
    'edit_code',
    'download_project',
    'preview_project',
  ] as const;

  return (
    <Card className="glass-effect border-primary/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="truncate">{project.title}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{project.summary}</p>
          </div>
          <Badge className="shrink-0 bg-primary/15 text-primary border-primary/20">
            {project.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground">Platform</div>
            <div className="text-sm font-semibold">{project.platform}</div>
          </div>
          <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground">Files</div>
            <div className="text-sm font-semibold">{Array.isArray(project.files) ? project.files.length : 0}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {orderedActionTypes
            .map((t) => actionMap.get(t))
            .filter(Boolean)
            .map((action) => {
              switch (action!.type) {
                case 'save_project':
                  return (
                    <Button
                      key={action!.type}
                      size="sm"
                      onClick={handleSave}
                      disabled={!action!.enabled || isSaving}
                      className="bg-primary text-primary-foreground"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving…' : 'Save project'}
                    </Button>
                  );

                case 'open_project':
                  return (
                    <Button
                      key={action!.type}
                      size="sm"
                      variant="outline"
                      onClick={handleOpen}
                      disabled={!action!.enabled}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Open project
                    </Button>
                  );

                case 'generate_code':
                  return (
                    <Button
                      key={action!.type}
                      size="sm"
                      variant="outline"
                      onClick={() => handleComingSoon('Generate code')}
                      disabled={!action!.enabled}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate code
                    </Button>
                  );

                case 'edit_code':
                  return (
                    <Button
                      key={action!.type}
                      size="sm"
                      variant="outline"
                      onClick={() => handleComingSoon('Edit code')}
                      disabled={!action!.enabled}
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Edit code
                    </Button>
                  );

                case 'download_project':
                  return (
                    <Button
                      key={action!.type}
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      disabled={!action!.enabled || isDownloading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isDownloading ? 'Downloading…' : 'Download ZIP'}
                    </Button>
                  );

                case 'preview_project':
                  return (
                    <Button
                      key={action!.type}
                      size="sm"
                      variant="outline"
                      onClick={() => handleComingSoon('Preview')}
                      disabled={!action!.enabled}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  );

                default:
                  return null;
              }
            })}
          {firstInoFile && (
            <Button size="sm" variant="outline" onClick={handleDownloadIno}>
              <Download className="w-4 h-4 mr-2" />
              Download .ino
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

