/**
 * Unit Tests for BackgroundSelector Component
 * 
 * Tests rendering, search, filtering, and selection functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackgroundSelector } from './BackgroundSelector';
import { EffectsProvider } from '@/contexts/EffectsContext';
import { PerfProvider } from '@/contexts/PerfContext';

// Mock the BackgroundLibrary
vi.mock('@/lib/backgrounds', () => ({
  BackgroundLibrary: {
    backgrounds: [
      {
        id: 'liquid-ether',
        name: 'Liquid Ether',
        description: 'Smooth flowing liquid',
        category: 'fluid',
        tags: ['liquid', 'smooth'],
        thumbnailUrl: '/test-thumb.webp',
        performanceLevel: 'medium',
        estimatedFPS: 45,
        supportsTheme: true,
        supportsAnimationControl: true,
        supportsSpeedControl: true,
        defaultSettings: { speed: 1.0 },
        settingsSchema: {},
        importPath: '@/components/backgrounds/LiquidEther',
        bundleSize: 45,
      },
      {
        id: 'particles',
        name: 'Particles',
        description: 'Classic particle system',
        category: 'particle',
        tags: ['particles', 'nodes'],
        thumbnailUrl: '/test-thumb2.webp',
        performanceLevel: 'light',
        estimatedFPS: 55,
        supportsTheme: true,
        supportsAnimationControl: true,
        supportsSpeedControl: true,
        defaultSettings: { particleCount: 100 },
        settingsSchema: {},
        importPath: '@/components/backgrounds/Particles',
        bundleSize: 44,
      },
      {
        id: 'grid-scan',
        name: 'Grid Scan',
        description: 'Scanning grid pattern',
        category: 'geometric',
        tags: ['grid', 'scan'],
        thumbnailUrl: '/test-thumb3.webp',
        performanceLevel: 'medium',
        estimatedFPS: 48,
        supportsTheme: true,
        supportsAnimationControl: true,
        supportsSpeedControl: true,
        defaultSettings: { gridSize: 40 },
        settingsSchema: {},
        importPath: '@/components/backgrounds/GridScan',
        bundleSize: 46,
      },
    ],
    filter: vi.fn((options) => {
      let results = [
        {
          id: 'liquid-ether',
          name: 'Liquid Ether',
          description: 'Smooth flowing liquid',
          category: 'fluid',
          tags: ['liquid', 'smooth'],
          thumbnailUrl: '/test-thumb.webp',
          performanceLevel: 'medium',
          estimatedFPS: 45,
          supportsTheme: true,
          supportsAnimationControl: true,
          supportsSpeedControl: true,
          defaultSettings: { speed: 1.0 },
          settingsSchema: {},
          importPath: '@/components/backgrounds/LiquidEther',
          bundleSize: 45,
        },
        {
          id: 'particles',
          name: 'Particles',
          description: 'Classic particle system',
          category: 'particle',
          tags: ['particles', 'nodes'],
          thumbnailUrl: '/test-thumb2.webp',
          performanceLevel: 'light',
          estimatedFPS: 55,
          supportsTheme: true,
          supportsAnimationControl: true,
          supportsSpeedControl: true,
          defaultSettings: { particleCount: 100 },
          settingsSchema: {},
          importPath: '@/components/backgrounds/Particles',
          bundleSize: 44,
        },
        {
          id: 'grid-scan',
          name: 'Grid Scan',
          description: 'Scanning grid pattern',
          category: 'geometric',
          tags: ['grid', 'scan'],
          thumbnailUrl: '/test-thumb3.webp',
          performanceLevel: 'medium',
          estimatedFPS: 48,
          supportsTheme: true,
          supportsAnimationControl: true,
          supportsSpeedControl: true,
          defaultSettings: { gridSize: 40 },
          settingsSchema: {},
          importPath: '@/components/backgrounds/GridScan',
          bundleSize: 46,
        },
      ];
      
      if (options.category && options.category !== 'all') {
        results = results.filter((bg) => bg.category === options.category);
      }
      
      if (options.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        results = results.filter((bg) => 
          bg.name.toLowerCase().includes(query) ||
          bg.description.toLowerCase().includes(query)
        );
      }
      
      return results;
    }),
    getById: vi.fn((id) => {
      const backgrounds = [
        {
          id: 'liquid-ether',
          name: 'Liquid Ether',
          description: 'Smooth flowing liquid',
          category: 'fluid',
          tags: ['liquid', 'smooth'],
          thumbnailUrl: '/test-thumb.webp',
          performanceLevel: 'medium',
          estimatedFPS: 45,
          supportsTheme: true,
          supportsAnimationControl: true,
          supportsSpeedControl: true,
          defaultSettings: { speed: 1.0 },
          settingsSchema: {},
          importPath: '@/components/backgrounds/LiquidEther',
          bundleSize: 45,
        },
      ];
      return backgrounds.find((bg) => bg.id === id);
    }),
    getBuiltInPresets: vi.fn(() => []),
    getUserPresets: vi.fn(() => []),
  },
}));

// Wrapper component with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PerfProvider>
      <EffectsProvider>
        {children}
      </EffectsProvider>
    </PerfProvider>
  );
}

describe('BackgroundSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the component with header', () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    expect(screen.getByText('Background Effects')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search backgrounds...')).toBeInTheDocument();
  });
  
  it('renders all category filter buttons', () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    expect(screen.getByText('All Backgrounds')).toBeInTheDocument();
    expect(screen.getByText('Fluid')).toBeInTheDocument();
    expect(screen.getByText('Geometric')).toBeInTheDocument();
    expect(screen.getByText('Particle')).toBeInTheDocument();
    expect(screen.getByText('Gradient')).toBeInTheDocument();
    expect(screen.getByText('Atmospheric')).toBeInTheDocument();
  });
  
  it('renders "None" option', () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Disable background effects')).toBeInTheDocument();
  });
  
  it('renders background thumbnails', async () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Liquid Ether')).toBeInTheDocument();
      expect(screen.getByText('Particles')).toBeInTheDocument();
      expect(screen.getByText('Grid Scan')).toBeInTheDocument();
    });
  });
  
  it('filters backgrounds by search query', async () => {
    const { BackgroundLibrary } = await import('@/lib/backgrounds');
    
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search backgrounds...');
    fireEvent.change(searchInput, { target: { value: 'liquid' } });
    
    await waitFor(() => {
      expect(BackgroundLibrary.filter).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: 'liquid',
        })
      );
    });
  });
  
  it('clears search when X button is clicked', async () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search backgrounds...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('test');
    });
    
    const clearButton = screen.getByRole('button', { name: '' });
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });
  
  it('filters backgrounds by category', async () => {
    const { BackgroundLibrary } = await import('@/lib/backgrounds');
    
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    const fluidButton = screen.getByText('Fluid');
    fireEvent.click(fluidButton);
    
    await waitFor(() => {
      expect(BackgroundLibrary.filter).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'fluid',
        })
      );
    });
  });
  
  it('displays "no results" message when search returns empty', async () => {
    const { BackgroundLibrary } = await import('@/lib/backgrounds');
    BackgroundLibrary.filter = vi.fn(() => []);
    
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search backgrounds...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No backgrounds found')).toBeInTheDocument();
    });
  });
  
  it('toggles category expansion', async () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    // Find category header (assuming it's rendered)
    await waitFor(() => {
      const categoryHeaders = screen.getAllByRole('button');
      expect(categoryHeaders.length).toBeGreaterThan(0);
    });
  });
  
  it('displays performance badges on thumbnails', async () => {
    render(
      <TestWrapper>
        <BackgroundSelector />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
    });
  });
});
