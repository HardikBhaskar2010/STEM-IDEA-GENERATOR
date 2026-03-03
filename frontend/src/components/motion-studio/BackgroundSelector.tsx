/**
 * BackgroundSelector Component
 * 
 * UI component for browsing and selecting background effects.
 * Displays thumbnails, search, filtering, and category organization.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { BackgroundLibrary } from '@/lib/backgrounds';
import type { BackgroundCategory, BackgroundMetadata } from '@/lib/backgrounds/types';
import { useEffects } from '@/contexts/EffectsContext';
import { BackgroundPresets } from './BackgroundPresets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  X, 
  Info,
  Zap,
  ZapOff,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackgroundSelectorProps {
  className?: string;
}

/**
 * Category display configuration
 */
const CATEGORY_CONFIG: Record<BackgroundCategory | 'all', { label: string; icon?: React.ReactNode }> = {
  all: { label: 'All Backgrounds' },
  fluid: { label: 'Fluid' },
  geometric: { label: 'Geometric' },
  particle: { label: 'Particle' },
  gradient: { label: 'Gradient' },
  atmospheric: { label: 'Atmospheric' },
};

/**
 * Performance level display configuration
 */
const PERFORMANCE_CONFIG = {
  light: { label: 'Light', color: 'bg-green-500', icon: ZapOff },
  medium: { label: 'Medium', color: 'bg-yellow-500', icon: Activity },
  heavy: { label: 'Heavy', color: 'bg-red-500', icon: Zap },
};

export function BackgroundSelector({ className }: BackgroundSelectorProps) {
  const { activeBackgroundEffect, setBackgroundEffect } = useEffects();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BackgroundCategory | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<BackgroundCategory>>(
    new Set(['fluid', 'geometric', 'particle', 'gradient', 'atmospheric'])
  );
  
  // Filter backgrounds based on search and category
  const filteredBackgrounds = useMemo(() => {
    return BackgroundLibrary.filter({
      category: selectedCategory,
      searchQuery: searchQuery.trim(),
    });
  }, [searchQuery, selectedCategory]);
  
  // Group backgrounds by category
  const backgroundsByCategory = useMemo(() => {
    const grouped: Record<BackgroundCategory, BackgroundMetadata[]> = {
      fluid: [],
      geometric: [],
      particle: [],
      gradient: [],
      atmospheric: [],
    };
    
    filteredBackgrounds.forEach((bg) => {
      grouped[bg.category].push(bg);
    });
    
    return grouped;
  }, [filteredBackgrounds]);
  
  // Handle background selection
  const handleSelectBackground = useCallback((backgroundId: string | null) => {
    if (backgroundId === null) {
      // "None" selected
      setBackgroundEffect(null);
    } else {
      const background = BackgroundLibrary.getById(backgroundId);
      if (background) {
        setBackgroundEffect(backgroundId, background.defaultSettings);
      }
    }
  }, [setBackgroundEffect]);
  
  // Handle category toggle
  const toggleCategory = useCallback((category: BackgroundCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Background Effects</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search backgrounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'fluid', 'geometric', 'particle', 'gradient', 'atmospheric'] as const).map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs"
            >
              {CATEGORY_CONFIG[category].label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Background List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Presets Section */}
        <div className="mb-6">
          <BackgroundPresets />
        </div>
        
        {/* None Option */}
        <div className="mb-4">
          <button
            onClick={() => handleSelectBackground(null)}
            className={cn(
              'w-full p-3 rounded-lg border-2 transition-all',
              'hover:border-primary hover:bg-accent',
              activeBackgroundEffect === null
                ? 'border-primary bg-accent'
                : 'border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">None</span>
              {activeBackgroundEffect === null && (
                <Badge variant="default">Active</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-left">
              Disable background effects
            </p>
          </button>
        </div>
        
        {/* Category Sections */}
        {filteredBackgrounds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No backgrounds found</p>
            {searchQuery && (
              <Button
                variant="link"
                size="sm"
                onClick={clearSearch}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.entries(backgroundsByCategory) as [BackgroundCategory, BackgroundMetadata[]][])
              .filter(([_, backgrounds]) => backgrounds.length > 0)
              .map(([category, backgrounds]) => (
                <div key={category}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between w-full mb-2 text-sm font-semibold hover:text-primary transition-colors"
                  >
                    <span>{CATEGORY_CONFIG[category].label} ({backgrounds.length})</span>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* Category Backgrounds */}
                  {expandedCategories.has(category) && (
                    <div className="grid grid-cols-2 gap-3">
                      {backgrounds.map((background) => (
                        <BackgroundThumbnail
                          key={background.id}
                          background={background}
                          isActive={activeBackgroundEffect === background.id}
                          onSelect={handleSelectBackground}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual background thumbnail component
 */
interface BackgroundThumbnailProps {
  background: BackgroundMetadata;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function BackgroundThumbnail({ background, isActive, onSelect }: BackgroundThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const performanceConfig = PERFORMANCE_CONFIG[background.performanceLevel];
  const PerformanceIcon = performanceConfig.icon;
  
  return (
    <button
      onClick={() => onSelect(background.id)}
      className={cn(
        'group relative rounded-lg border-2 overflow-hidden transition-all',
        'hover:border-primary hover:shadow-lg',
        isActive ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
      )}
    >
      {/* Thumbnail Image */}
      <div className="aspect-video bg-muted relative">
        {!imageError ? (
          <img
            src={background.thumbnailUrl}
            alt={background.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-xs">No preview</span>
          </div>
        )}
        
        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}
        
        {/* Active Badge */}
        {isActive && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="text-xs">Active</Badge>
          </div>
        )}
        
        {/* Performance Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <PerformanceIcon className="h-3 w-3" />
            {performanceConfig.label}
          </Badge>
        </div>
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="text-white text-center p-2">
            <p className="text-sm font-medium mb-1">{background.name}</p>
            <p className="text-xs opacity-90">{background.description}</p>
          </div>
        </div>
      </div>
      
      {/* Info Footer */}
      <div className="p-2 bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium truncate">{background.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open documentation modal
              window.open(background.documentationUrl, '_blank');
            }}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
      </div>
    </button>
  );
}
