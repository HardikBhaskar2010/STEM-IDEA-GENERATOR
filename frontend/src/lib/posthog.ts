import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog client for frontend analytics
 */
export const initPostHog = () => {
  if (isInitialized) return;

  if (!POSTHOG_KEY) {
    console.info('💡 PostHog: VITE_POSTHOG_KEY not set. Running in dry-run mode (events logged to dev console).');
    isInitialized = true;
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: false, // Handled dynamically via usePostHogPageViews hook
      persistence: 'localStorage+cookie',
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          ph.debug();
        }
      },
    });
    isInitialized = true;
    console.log('🚀 PostHog initialized successfully');
  } catch (error) {
    console.warn('⚠️ PostHog initialization warning:', error);
  }
};

/**
 * Capture custom frontend analytics event
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (POSTHOG_KEY && isInitialized) {
    posthog.capture(eventName, properties);
  } else {
    if (import.meta.env.DEV) {
      console.log(`[PostHog Dry-Run Event] ${eventName}`, properties);
    }
  }
};

/**
 * Identify authenticated user and set user traits
 */
export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  if (POSTHOG_KEY && isInitialized) {
    posthog.identify(userId, userProperties);
  } else {
    if (import.meta.env.DEV) {
      console.log(`[PostHog Dry-Run Identify] User: ${userId}`, userProperties);
    }
  }
};

/**
 * Reset PostHog user identity on logout
 */
export const resetUser = () => {
  if (POSTHOG_KEY && isInitialized) {
    posthog.reset();
  } else {
    if (import.meta.env.DEV) {
      console.log('[PostHog Dry-Run Reset]');
    }
  }
};

/**
 * Track SPA Pageviews on route changes
 */
export const trackPageView = (path: string, title?: string) => {
  if (POSTHOG_KEY && isInitialized) {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: path,
      title: title || document.title,
    });
  } else {
    if (import.meta.env.DEV) {
      console.log(`[PostHog Dry-Run PageView] ${path}`);
    }
  }
};

export default posthog;
