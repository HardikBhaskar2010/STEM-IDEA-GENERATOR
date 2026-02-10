'use client';

import { useState, useCallback, useMemo } from 'react';
import { previewService } from '@/services/previewService';
import type { CodeFile } from '@/services/codeGenerationService';


interface UseLivePreviewReturn {
  previewHtml: string;
  previewError: string | null;
  isGeneratingPreview: boolean;
  
  generatePreview: (files: CodeFile[], platform: string) => void;
  refreshPreview: () => void;
  clearError: () => void;
}

export const useLivePreview = (files: CodeFile[], platform: string): UseLivePreviewReturn => {
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Generate preview HTML
  const previewHtml = useMemo(() => {
    if (platform !== 'web' || files.length === 0) {
      return '';
    }

    try {
      return previewService.generatePreview(files, platform).html;
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
      return '';
    }
  }, [files, platform]);

  const generatePreview = useCallback((newFiles: CodeFile[], newPlatform: string) => {
    if (newPlatform !== 'web') {
      setPreviewError('Preview is only available for web projects');
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      // Preview is generated automatically via useMemo
      setIsGeneratingPreview(false);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
      setIsGeneratingPreview(false);
    }
  }, []);

  const refreshPreview = useCallback(() => {
    generatePreview(files, platform);
  }, [files, platform, generatePreview]);

  const clearError = useCallback(() => {
    setPreviewError(null);
  }, []);

  return {
    previewHtml,
    previewError,
    isGeneratingPreview,
    generatePreview,
    refreshPreview,
    clearError
  };
};