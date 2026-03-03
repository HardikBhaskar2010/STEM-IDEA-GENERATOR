"/**
 * Preset Share Page
 * Route: /preset/:presetId
 * 
 * Preview and import shared presets
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { presetService } from '@/services/presetService';
import { useEffects } from '@/contexts/EffectsContext';
import { toast } from 'sonner';
import type { EffectPreset } from '@/types/effects';

const PresetSharePage: React.FC = () => {
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();
  const { loadPreset } = useEffects();
  
  const [preset, setPreset] = useState<EffectPreset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetId) {
      loadPresetData(presetId);
    }
  }, [presetId]);

  const loadPresetData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await presetService.getPresetById(id);
      
      if (!data) {
        setError('Preset not found');
        return;
      }
      
      // Check if preset is public or user owns it
      if (!data.isPublic) {
        setError('This preset is private and cannot be shared');
        return;
      }
      
      setPreset(data);
    } catch (err) {
      console.error('Error loading preset:', err);
      setError('Failed to load preset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPreset = async () => {
    if (!preset) return;
    
    try {
      // Duplicate the preset to user's collection
      const duplicate = await presetService.duplicatePreset(preset.id);
      
      if (duplicate) {
        toast.success('Preset imported to your collection!');
        navigate('/dashboard');
        
        // Load the preset into the effects engine
        setTimeout(() => {
          loadPreset(duplicate);
        }, 500);
      } else {
        toast.error('Failed to import preset');
      }
    } catch (error) {
      console.error('Error importing preset:', error);
      toast.error('Failed to import preset');
    }
  };

  const handlePreview = () => {
    if (!preset) return;
    
    // Load preset for preview
    loadPreset(preset);
    toast.success('Preset loaded!');
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className=\"container mx-auto px-4 py-16\">
          <div className=\"max-w-2xl mx-auto\">
            <div className=\"flex items-center justify-center py-32\">
              <Loader2 className=\"h-12 w-12 animate-spin text-primary\" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !preset) {
    return (
      <Layout>
        <div className=\"container mx-auto px-4 py-16\">
          <div className=\"max-w-2xl mx-auto\">
            <Card className=\"glass-effect border-destructive/20\">
              <CardHeader>
                <CardTitle className=\"text-destructive\">Error</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-4\">
                <p className=\"text-muted-foreground\">
                  {error || 'Preset not found'}
                </p>
                <Button onClick={() => navigate('/')} variant=\"outline\">
                  <ArrowLeft className=\"h-4 w-4 mr-2\" />
                  Go Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className=\"container mx-auto px-4 py-16\">
        <div className=\"max-w-3xl mx-auto space-y-6\">
          {/* Back Button */}
          <Button
            variant=\"ghost\"
            onClick={() => navigate(-1)}
            className=\"mb-4\"
          >
            <ArrowLeft className=\"h-4 w-4 mr-2\" />
            Back
          </Button>

          {/* Preset Preview Card */}
          <Card className=\"glass-effect border-primary/20\">
            <CardHeader className=\"bg-gradient-to-r from-primary/10 to-transparent\">
              <div className=\"flex items-start justify-between\">
                <div className=\"space-y-2\">
                  <div className=\"flex items-center gap-2\">
                    <CardTitle className=\"text-3xl\">{preset.name}</CardTitle>
                    <Badge variant=\"default\" className=\"bg-primary/20\">
                      <Globe className=\"h-3 w-3 mr-1\" />
                      Public
                    </Badge>
                  </div>
                  {preset.description && (
                    <p className=\"text-muted-foreground\">{preset.description}</p>
                  )}
                  <p className=\"text-xs text-muted-foreground\">
                    Shared {preset.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className=\"pt-6 space-y-6\">
              {/* Effects Preview */}
              <div className=\"space-y-4\">
                <h3 className=\"text-lg font-semibold\">Included Effects</h3>
                
                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                  {preset.effects.text && (
                    <div className=\"p-4 rounded-lg border border-border bg-muted/30\">
                      <h4 className=\"font-medium text-sm mb-2\">✨ Text Effect</h4>
                      <Badge variant=\"outline\">{preset.effects.text.effectId}</Badge>
                    </div>
                  )}
                  
                  {preset.effects.cursor && (
                    <div className=\"p-4 rounded-lg border border-border bg-muted/30\">
                      <h4 className=\"font-medium text-sm mb-2\">🖱️ Cursor Effect</h4>
                      <Badge variant=\"outline\">{preset.effects.cursor.effectId}</Badge>
                    </div>
                  )}
                  
                  {preset.effects.background && (
                    <div className=\"p-4 rounded-lg border border-border bg-muted/30\">
                      <h4 className=\"font-medium text-sm mb-2\">🌌 Background Effect</h4>
                      <Badge variant=\"outline\">{preset.effects.background.effectId}</Badge>
                    </div>
                  )}
                  
                  {preset.effects.ui && (
                    <div className=\"p-4 rounded-lg border border-border bg-muted/30\">
                      <h4 className=\"font-medium text-sm mb-2\">✨ UI Effect</h4>
                      <Badge variant=\"outline\">{preset.effects.ui.effectId}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className=\"flex gap-4 pt-4\">
                <Button
                  onClick={handleImportPreset}
                  className=\"flex-1 bg-gradient-primary text-white\"
                  size=\"lg\"
                >
                  <Download className=\"h-5 w-5 mr-2\" />
                  Import to My Presets
                </Button>
                
                <Button
                  onClick={handlePreview}
                  variant=\"outline\"
                  size=\"lg\"
                >
                  Preview in Studio
                </Button>
              </div>

              {/* Info Box */}
              <div className=\"p-4 rounded-lg bg-muted/50 border border-border\">
                <p className=\"text-sm text-muted-foreground\">
                  💡 Importing this preset will create a copy in your presets library. 
                  You can then customize it and use it in your projects.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PresetSharePage;
"
