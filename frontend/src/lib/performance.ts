// Performance monitoring utilities

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  navigationTiming: PerformanceNavigationTiming | null;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Monitor navigation timing
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.measureNavigationTiming();
      this.observeResourceTiming();
      this.observeLongTasks();
    }
  }

  private measureNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.navigationTiming = navigation;
      this.metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 100) {
            // eslint-disable-next-line no-console
            console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            // eslint-disable-next-line no-console
            console.warn(`Long task detected: ${entry.duration}ms`);
          });
        });

        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      } catch {
        // Long task observer not supported
      }
    }
  }

  // Measure component render time
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    if (renderTime > 16) { // More than one frame at 60fps
      // eslint-disable-next-line no-console
      console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
    
    return result;
  }

  // Get current memory usage (if available)
  getMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return memory ? memory.usedJSHeapSize / 1024 / 1024 : null; // Convert to MB
    }
    return null;
  }

  // Get Web Vitals
  getWebVitals(): Promise<{
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
  }> {
    return new Promise((resolve) => {
      const vitals: Record<string, number> = {};

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1];
        vitals.fcp = fcp.startTime;
        fcpObserver.disconnect();
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        vitals.lcp = lcp.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
          if (entry.processingStart) {
            vitals.fid = entry.processingStart - entry.startTime;
          }
        });
        fidObserver.disconnect();
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
          if (!entry.hadRecentInput && entry.value) {
            clsValue += entry.value;
          }
        });
        vitals.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Return vitals after a delay to collect data
      setTimeout(() => {
        resolve(vitals);
        lcpObserver.disconnect();
        clsObserver.disconnect();
      }, 3000);
    });
  }

  // Log performance summary
  logSummary() {
    const memory = this.getMemoryUsage();
    // eslint-disable-next-line no-console
    console.group('Performance Summary');
    // eslint-disable-next-line no-console
    console.log('Load Time:', this.metrics.loadTime?.toFixed(2) + 'ms');
    // eslint-disable-next-line no-console
    console.log('Memory Usage:', memory ? memory.toFixed(2) + 'MB' : 'N/A');
    
    this.getWebVitals().then((vitals) => {
      // eslint-disable-next-line no-console
      console.log('Web Vitals:', vitals);
      // eslint-disable-next-line no-console
      console.groupEnd();
    });
  }

  // Cleanup observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    measureRender: performanceMonitor.measureRender.bind(performanceMonitor),
    getMemoryUsage: performanceMonitor.getMemoryUsage.bind(performanceMonitor),
    getWebVitals: performanceMonitor.getWebVitals.bind(performanceMonitor),
    logSummary: performanceMonitor.logSummary.bind(performanceMonitor),
  };
};

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    // eslint-disable-next-line no-console
    console.group('Bundle Analysis');
    // eslint-disable-next-line no-console
    console.log('Script files:', scripts.length);
    // eslint-disable-next-line no-console
    console.log('Stylesheet files:', styles.length);
    
    scripts.forEach((script: HTMLScriptElement) => {
      // eslint-disable-next-line no-console
      console.log('Script:', script.src);
    });
    
    styles.forEach((style: HTMLLinkElement) => {
      // eslint-disable-next-line no-console
      console.log('Stylesheet:', style.href);
    });
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
};