/**
 * API Debug Utilities
 * Helps identify and fix API configuration issues
 */

// Override fetch to log all API calls
const originalFetch = window.fetch;

window.fetch = function(...args) {
  const [url, options] = args;
  
  // Log all API calls for debugging
  if (typeof url === 'string' && url.includes('onrender.com')) {
    console.log(`🌐 API Call Intercepted:`, {
      url,
      method: options?.method || 'GET',
      timestamp: new Date().toISOString()
    });
    
    // Check if this is the problematic call
    if (url === 'https://perfection-v2.onrender.com/health') {
      console.error(`❌ FOUND THE ISSUE: Incorrect API call detected!`);
      console.error(`Expected: https://perfection-v2.onrender.com/api/health`);
      console.error(`Actual: ${url}`);
      console.trace('Call stack:');
    }
  }
  
  return originalFetch.apply(this, args);
};

export const debugApiCalls = () => {
  console.log('🔍 API Debug mode enabled - all API calls will be logged');
};