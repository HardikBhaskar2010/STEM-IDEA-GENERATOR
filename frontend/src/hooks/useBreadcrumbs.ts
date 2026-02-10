'use client';

import { useMemo } from 'react';
import { useLocation } from '@/lib/navigation';
import { Home, Zap, Cpu, BookOpen, User } from 'lucide-react';
import { type BreadcrumbItem } from '@/components/ui/breadcrumb';

// Route configuration for breadcrumbs
const routeConfig: Record<string, { title: string; icon?: React.ComponentType<{ className?: string }> }> = {
  '/': { title: 'Home', icon: Home },
  '/generator': { title: 'Generator', icon: Zap },
  '/components': { title: 'Components', icon: Cpu },
  '/library': { title: 'Library', icon: BookOpen },
  '/profile': { title: 'Profile', icon: User },
};

export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  const pathname = location.pathname || '/';

  return useMemo(() => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with home if not on home page
    if (pathname !== '/') {
      breadcrumbs.push({
        label: 'Home',
        path: '/',
        icon: Home,
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;

      const config = routeConfig[currentPath];
      if (config) {
        breadcrumbs.push({
          label: config.title,
          path: currentPath,
          icon: config.icon,
        });
      } else {
        // Fallback for dynamic routes or unknown paths
        const formattedLabel = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        breadcrumbs.push({
          label: formattedLabel,
          path: currentPath,
        });
      }
    });

    return breadcrumbs;
  }, [pathname]);
};

// Hook to get page title from breadcrumbs
export const usePageTitle = (): string => {
  const breadcrumbs = useBreadcrumbs();
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  return lastBreadcrumb?.label || 'STEM Project Generator';
};
