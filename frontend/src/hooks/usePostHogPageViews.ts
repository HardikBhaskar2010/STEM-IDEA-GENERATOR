import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/posthog';

/**
 * Custom React hook to automatically send SPA pageview events to PostHog on route change
 */
export const usePostHogPageViews = () => {
  const location = useLocation();

  useEffect(() => {
    // Send pageview on route change
    trackPageView(location.pathname + location.search);
  }, [location]);
};
