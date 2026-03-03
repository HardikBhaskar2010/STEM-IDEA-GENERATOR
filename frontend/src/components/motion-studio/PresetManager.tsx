/**
 * Preset Manager - Save/Load/Share presets
 * 
 * Modal for managing effect presets (CRUD operations)
 */

import { useState, useEffect } from 'react';
import { useEffects } from '@/contexts/EffectsContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Save, Download, Upload, Link as LinkIcon, Copy, Trash2, Globe, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EffectPreset } from '@/types/effects';
import { presetService } from '@/services/presetService';

interface PresetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PresetManager({ open, onOpenChange }: PresetManagerProps) {
  const {
    activeTextEffect,
    activeTextSettings,
    activeCursorEffect,
    activeCursorSettings,
    activeBackgroundEffect,
    activeBackgroundSettings,
    activeUIEffect,
    activeUISettings,
    loadPreset,
    currentPreset,
  } = useEffects();
  
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [userPresets, setUserPresets] = useState<EffectPreset[]>([]);
  const [publicPresets, setPublicPresets] = useState<EffectPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserPresets, setLoadingUserPresets] = useState(false);
  const [loadingPublicPresets, setLoadingPublicPresets] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  // Load user and public presets on mount
  useEffect(() => {
    if (open) {
      loadUserPresets();
      loadPublicPresets();
    }
  }, [open]);

  const loadUserPresets = async () => {
    setLoadingUserPresets(true);
    try {
      const presets = await presetService.getUserPresets();
      setUserPresets(presets);
    } catch (error) {
      console.error('Failed to load user presets:', error);
      toast.error('Failed to load your presets');
    } finally {
      setLoadingUserPresets(false);
    }
  };

  const loadPublicPresets = async () => {
    setLoadingPublicPresets(true);
    try {
      const presets = await presetService.getPublicPresets();
      setPublicPresets(presets);
    } catch (error) {
      console.error('Failed to load public presets:', error);
      toast.error('Failed to load public presets');
    } finally {
      setLoadingPublicPresets(false);
    }
  };
  
  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!activeTextEffect && !activeCursorEffect && !activeBackgroundEffect && !activeUIEffect) {
      toast.error('Please activate at least one effect before saving');
      return;
    }
    
    setLoading(true);
    
    try {
      const preset = await presetService.savePreset({
        name: presetName.trim(),
        description: presetDescription.trim() || undefined,
        effects: {
          ...(activeTextEffect && {
            text: {
              effectId: activeTextEffect,
              settings: activeTextSettings,
            },
          }),
          ...(activeCursorEffect && {
            cursor: {
              effectId: activeCursorEffect,
              settings: activeCursorSettings,
            },
          }),
          ...(activeBackgroundEffect && {
            background: {
              effectId: activeBackgroundEffect,
              settings: activeBackgroundSettings,
            },
          }),
          ...(activeUIEffect && {
            ui: {
              effectId: activeUIEffect,
              settings: activeUISettings,
            },
          }),
        },
        isPublic: false,
      });

      if (preset) {
        toast.success('Preset saved successfully!');
        setPresetName('');
        setPresetDescription('');
        await loadUserPresets(); // Reload user presets
      } else {
        toast.error('Failed to save preset');
      }
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportJSON = () => {
    const preset = {
      name: presetName || 'Untitled Preset',
      effects: {
        text: activeTextEffect ? { effectId: activeTextEffect, settings: activeTextSettings } : undefined,
        cursor: activeCursorEffect ? { effectId: activeCursorEffect, settings: activeCursorSettings } : undefined,
        background: activeBackgroundEffect ? { effectId: activeBackgroundEffect, settings: activeBackgroundSettings } : undefined,
        ui: activeUIEffect ? { effectId: activeUIEffect, settings: activeUISettings } : undefined,
      },
    };
    
    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Preset exported as JSON');
  };
  
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const preset = JSON.parse(e.target?.result as string);
        
        if (!presetService.validatePresetStructure(preset)) {
          toast.error('Invalid preset file structure');
          return;
        }
        
        loadPreset(preset as EffectPreset);
        toast.success('Preset imported successfully');
      } catch (error) {
        toast.error('Invalid preset file');
      }
    };
    reader.readAsText(file);
    
    // Reset input value so same file can be imported again
    event.target.value = '';
  };
  
  const handleGenerateShareLink = () => {
    if (!currentPreset?.id) {
      toast.error('Please save the preset first');
      return;
    }
    
    const link = `${window.location.origin}/motion-studio?preset=${currentPreset.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Share link copied to clipboard');
  };

  const handleLoadPreset = (preset: EffectPreset) => {
    loadPreset(preset);
    toast.success(`Loaded preset: ${preset.name}`);
    onOpenChange(false);
  };

  const confirmDelete = (presetId: string) => {
    setPresetToDelete(presetId);
    setDeleteDialogOpen(true);
  };

  const handleDeletePreset = async () => {
    if (!presetToDelete) return;
    
    setLoading(true);
    try {
      const success = await presetService.deletePreset(presetToDelete);
      
      if (success) {
        toast.success('Preset deleted successfully');
        await loadUserPresets(); // Reload presets
      } else {
        toast.error('Failed to delete preset');
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setPresetToDelete(null);
    }
  };

  const handleDuplicatePreset = async (presetId: string) => {
    setLoading(true);
    try {
      const duplicate = await presetService.duplicatePreset(presetId);
      
      if (duplicate) {
        toast.success('Preset duplicated successfully');
        await loadUserPresets(); // Reload presets
      } else {
        toast.error('Failed to duplicate preset');
      }
    } catch (error) {
      console.error('Error duplicating preset:', error);
      toast.error('An error occurred while duplicating');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async (presetId: string) => {
    setLoading(true);
    try {
      const updated = await presetService.togglePresetPublic(presetId);
      
      if (updated) {
        const status = updated.isPublic ? 'public' : 'private';
        toast.success(`Preset is now ${status}`);
        await loadUserPresets(); // Reload presets
      } else {
        toast.error('Failed to update preset visibility');
      }
    } catch (error) {
      console.error('Error toggling preset visibility:', error);
      toast.error('An error occurred while updating');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Preset Manager</DialogTitle>
          <DialogDescription>
            Save, load, and share your effect presets
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="save" className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="save">Save</TabsTrigger>
            <TabsTrigger value="my-presets">My Presets</TabsTrigger>
            <TabsTrigger value="public">Public Presets</TabsTrigger>
            <TabsTrigger value="export">Export/Import</TabsTrigger>
          </TabsList>
          
          {/* Save Tab */}
          <TabsContent value="save" className="flex-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  placeholder="My Awesome Effect"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preset-description">Description (optional)</Label>
                <Input
                  id="preset-description"
                  placeholder="A brief description..."
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                />
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <p className="text-sm font-medium mb-2">Current Effects:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {activeTextEffect && <li>✓ Text: {activeTextEffect}</li>}
                  {activeCursorEffect && <li>✓ Cursor: {activeCursorEffect}</li>}
                  {activeBackgroundEffect && <li>✓ Background: {activeBackgroundEffect}</li>}
                  {activeUIEffect && <li>✓ UI: {activeUIEffect}</li>}
                  {!activeTextEffect && !activeCursorEffect && !activeBackgroundEffect && !activeUIEffect && (
                    <li className="text-yellow-600">⚠️ No effects active</li>
                  )}
                </ul>
              </div>
              
              <Button onClick={handleSavePreset} className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preset
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* My Presets Tab */}
          <TabsContent value="my-presets" className="flex-1">
            <ScrollArea className="h-96">
              {loadingUserPresets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : userPresets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No saved presets yet</p>
                  <p className="text-xs mt-1">Create your first preset in the Save tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userPresets.map((preset) => (
                    <div key={preset.id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{preset.name}</h4>
                            {preset.isPublic ? (
                              <Badge variant="default" className="gap-1">
                                <Globe className="h-3 w-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                              </Badge>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{preset.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2 text-xs text-muted-foreground">
                            {preset.effects.text && <span className="px-2 py-0.5 rounded bg-purple-500/10">Text</span>}
                            {preset.effects.cursor && <span className="px-2 py-0.5 rounded bg-blue-500/10">Cursor</span>}
                            {preset.effects.background && <span className="px-2 py-0.5 rounded bg-green-500/10">Background</span>}
                            {preset.effects.ui && <span className="px-2 py-0.5 rounded bg-orange-500/10">UI</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleLoadPreset(preset)}
                            disabled={loading}
                          >
                            Load
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDuplicatePreset(preset.id)}
                            disabled={loading}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTogglePublic(preset.id)}
                            disabled={loading}
                            title={preset.isPublic ? 'Make Private' : 'Make Public'}
                          >
                            {preset.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => confirmDelete(preset.id)}
                            disabled={loading}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Public Presets Tab */}
          <TabsContent value="public" className="flex-1">
            <ScrollArea className="h-96">
              {loadingPublicPresets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : publicPresets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No public presets available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicPresets.map((preset) => (
                    <div key={preset.id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{preset.name}</h4>
                            <Badge variant="default" className="gap-1">
                              <Globe className="h-3 w-3" />
                              Public
                            </Badge>
                          </div>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{preset.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2 text-xs text-muted-foreground">
                            {preset.effects.text && <span className="px-2 py-0.5 rounded bg-purple-500/10">Text</span>}
                            {preset.effects.cursor && <span className="px-2 py-0.5 rounded bg-blue-500/10">Cursor</span>}
                            {preset.effects.background && <span className="px-2 py-0.5 rounded bg-green-500/10">Background</span>}
                            {preset.effects.ui && <span className="px-2 py-0.5 rounded bg-orange-500/10">UI</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleLoadPreset(preset)}
                            disabled={loading}
                          >
                            Load
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDuplicatePreset(preset.id)}
                            disabled={loading}
                            title="Duplicate to My Presets"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Export/Import Tab */}
          <TabsContent value="export" className="flex-1">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Export Preset</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Download your current effects as a JSON file
                </p>
                <Button onClick={handleExportJSON} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Import Preset</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Load a preset from a JSON file
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                    id="import-preset"
                  />
                  <Button variant="outline" className="w-full" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import from JSON
                    </span>
                  </Button>
                </label>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Share Preset</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a shareable link to your preset
                </p>
                <Button onClick={handleGenerateShareLink} variant="outline" className="w-full">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Share Link
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this preset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePreset}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}


