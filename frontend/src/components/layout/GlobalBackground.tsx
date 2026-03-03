import { useLocation } from 'react-router-dom';
import { FloatingLinesBackground } from './FloatingLinesBackground';
import ScrollDrivenHero from '../ScrollDrivenHero';

/**
 * GlobalBackground - Centralized background management component
 * 
 * This component uses route-aware logic to render exactly ONE background system per route:
 * - "/" (Welcome) → ScrollDrivenHero only (interactive 3D with raycasting)
 * - "/login" and "/motion-studio" → No global backgrounds (pages control their own)
 * - All other routes → FloatingLinesBackground only
 * 
 * All backgrounds enforce a standardized layering contract:
 * className="fixed inset-0 pointer-events-none -z-10"
 */
export function GlobalBackground() {
  const location = useLocation();

  // Route: "/" (Welcome Page) - ScrollDrivenHero only
  if (location.pathname === '/') {
    // ScrollDrivenHero manages its own positioning and layering
    // It's interactive (raycasting, hover nodes) so it doesn't use pointer-events-none
    return <ScrollDrivenHero />;
  }

  // Route: "/login" - No global background (AuthLayout controls its own)
  if (location.pathname === '/login') {
    return null;
  }

  // Route: "/motion-studio" - No global background (studio controls preview backgrounds)
  if (location.pathname === '/motion-studio') {
    return null;
  }

  // All other routes - FloatingLinesBackground (already has fixed positioning)
  return <FloatingLinesBackground />;
}
