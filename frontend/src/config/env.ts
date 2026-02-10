/**
 * Environment configuration for Next.js
 * Provides consistent access to environment variables across the app
 */

export const env = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api',
    wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8001',
  },

  // EmailJS Configuration
  emailjs: {
    serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
    templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
  },

  // ElevenLabs TTS Configuration
  elevenlabs: {
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_TOKEN || '',
  },

  // Development mode check
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Helper function to get WebSocket URL from HTTP URL
export function getWebSocketUrl(httpUrl: string): string {
  return httpUrl
    .replace('https://', 'wss://')
    .replace('http://', 'ws://')
    .replace('/api', '');
}

// Validate required environment variables
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: env.supabase.url },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.supabase.anonKey },
    { key: 'NEXT_PUBLIC_API_BASE_URL', value: env.api.baseUrl },
  ];

  const missing = required
    .filter(({ value }) => !value)
    .map(({ key }) => key);

  return {
    valid: missing.length === 0,
    missing,
  };
}

// Log environment configuration in development
if (env.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    api: env.api.baseUrl,
    supabase: env.supabase.url ? '✓ Configured' : '✗ Missing',
    mode: process.env.NODE_ENV,
  });
}
