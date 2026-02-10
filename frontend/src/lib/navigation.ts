/**
 * Navigation utilities for Next.js migration
 * Provides compatibility layer between React Router and Next.js navigation
 */

'use client';

import { useRouter as useNextRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Custom hook that provides React Router-like navigation API using Next.js router
 * This helps during migration from React Router to Next.js
 */
export function useNavigate() {
  const router = useNextRouter();
  
  return useCallback((path: string | number, options?: { replace?: boolean }) => {
    if (typeof path === 'number') {
      // Handle back/forward navigation
      if (path === -1) {
        router.back();
      } else if (path === 1) {
        router.forward();
      }
      return;
    }

    // Handle string paths
    if (options?.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
  }, [router]);
}

/**
 * Custom hook for location information
 */
export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  
  return {
    pathname,
    search: searchParams?.toString() ? `?${searchParams.toString()}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: null, // Next.js doesn't support location state by default
  };
}

/**
 * Hook to get URL parameters
 */
export function useParams<T = Record<string, string>>(): Partial<T> {
  return useNextParams() as Partial<T>;
}

/**
 * Re-export useSearchParams from Next.js for compatibility
 */
export { useSearchParams } from 'next/navigation';

/**
 * Link component wrapper for migration compatibility
 * Use Next.js Link directly in new code
 */
export { default as Link } from 'next/link';
