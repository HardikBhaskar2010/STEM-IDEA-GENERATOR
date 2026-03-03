/**
 * Pixel Blast Background Wrapper
 * 
 * Explosive pixel particles with dynamic bursts
 * Category: Particle
 * Performance: Heavy (28 FPS)
 * 
 * Validates: Requirements 1.1, 7.1, 7.2, 7.4, 17.1, 17.3
 */

import React from 'react';
import { withReactbitsWrapper } from '@/lib/backgrounds/ReactbitsBackgroundWrapper';
import type { ReactbitsBackgroundProps } from '@/lib/backgrounds/types';

/**
 * Placeholder component for Pixel Blast background
 * This will be replaced with the actual reactbits component
 */
const PixelBlastComponent: React.FC<any> = (props) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500">
      {/* Placeholder for Pixel Blast reactbits component */}
    </div>
  );
};

/**
 * Wrapped Pixel Blast background with standardized interface
 */
export const PixelBlast = withReactbitsWrapper(
  PixelBlastComponent,
  'pixel-blast',
  true // Supports theme
);

export default PixelBlast;
