/**
 * Centralized error handling and retry logic utilities
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
}

export interface ErrorContext {
  operation: string;
  service: string;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
}

export class ServiceError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    context: ErrorContext,
    originalError?: Error,
    retryable = false
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error instanceof ServiceError) {
      return error.retryable;
    }
    
    // Check for common retryable error patterns
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /5\d{2}/,  // 5xx status codes
      /rate.?limit/i
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }
};

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === config.maxAttempts || !config.retryCondition!(lastError)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );
      
      const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
      const totalDelay = delay + jitter;
      
      console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${Math.round(totalDelay)}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError!;
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000, // 1 minute
    private readonly monitoringPeriod = 300000 // 5 minutes
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new ServiceError(
          'Circuit breaker is open',
          'CIRCUIT_BREAKER_OPEN',
          {
            operation: 'circuit_breaker_check',
            service: 'error_handler',
            timestamp: new Date()
          }
        );
      }
    }
    
    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      console.warn(`Circuit breaker opened after ${this.failures} failures`);
    }
  }
  
  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
    console.info('Circuit breaker reset to closed state');
  }
  
  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Error logger with different severity levels
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: Array<{
    level: 'error' | 'warn' | 'info';
    message: string;
    context: ErrorContext;
    timestamp: Date;
    error?: Error;
  }> = [];
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }
  
  error(message: string, context: ErrorContext, error?: Error): void {
    this.log('error', message, context, error);
    console.error(`[${context.service}] ${message}`, error);
  }
  
  warn(message: string, context: ErrorContext): void {
    this.log('warn', message, context);
    console.warn(`[${context.service}] ${message}`);
  }
  
  info(message: string, context: ErrorContext): void {
    this.log('info', message, context);
    console.info(`[${context.service}] ${message}`);
  }
  
  private log(
    level: 'error' | 'warn' | 'info',
    message: string,
    context: ErrorContext,
    error?: Error
  ): void {
    this.logs.push({
      level,
      message,
      context,
      timestamp: new Date(),
      error
    });
    
    // Keep only last 1000 logs to prevent memory leaks
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
    
    // In production, you might want to send logs to a service
    if (level === 'error' && typeof window !== 'undefined') {
      this.reportError(message, context, error);
    }
  }
  
  private reportError(message: string, context: ErrorContext, error?: Error): void {
    // In a real application, send to error reporting service
    // For now, just store in localStorage for debugging
    try {
      const errorReport = {
        message,
        context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      const existingReports = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingReports.push(errorReport);
      
      // Keep only last 50 error reports
      const recentReports = existingReports.slice(-50);
      localStorage.setItem('error_reports', JSON.stringify(recentReports));
    } catch (e) {
      console.error('Failed to store error report:', e);
    }
  }
  
  getLogs(level?: 'error' | 'warn' | 'info'): typeof this.logs {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ServiceError(
          timeoutMessage,
          'TIMEOUT',
          {
            operation: 'timeout_check',
            service: 'error_handler',
            timestamp: new Date()
          },
          undefined,
          true // Timeouts are usually retryable
        ));
      }, timeoutMs);
    })
  ]);
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}
  
  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      throw new ServiceError(
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`,
        'RATE_LIMIT_EXCEEDED',
        {
          operation: 'rate_limit_check',
          service: 'error_handler',
          timestamp: new Date()
        },
        undefined,
        true
      );
    }
    
    this.requests.push(now);
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

/**
 * Enhanced fetch wrapper with error handling and retry logic
 */
export async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  const context: ErrorContext = {
    operation: 'fetch',
    service: 'http_client',
    timestamp: new Date()
  };
  
  return withRetry(async () => {
    try {
      const response = await withTimeout(
        fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        }),
        30000 // 30 second timeout
      );
      
      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429;
        
        throw new ServiceError(
          `HTTP ${response.status}: ${response.statusText}`,
          `HTTP_${response.status}`,
          context,
          undefined,
          isRetryable
        );
      }
      
      return response;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      // Handle network errors
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      
      throw new ServiceError(
        error instanceof Error ? error.message : 'Unknown fetch error',
        isNetworkError ? 'NETWORK_ERROR' : 'FETCH_ERROR',
        context,
        error instanceof Error ? error : undefined,
        isNetworkError
      );
    }
  }, retryOptions);
}

/**
 * Graceful degradation helper
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  context: ErrorContext
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    ErrorLogger.getInstance().warn(
      `Primary operation failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context
    );
    
    return await fallback();
  }
}

/**
 * Batch operation with partial failure handling
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
    retryOptions?: Partial<RetryOptions>;
  } = {}
): Promise<{ results: R[]; errors: Error[] }> {
  const { concurrency = 5, continueOnError = true, retryOptions = {} } = options;
  const results: R[] = [];
  const errors: Error[] = [];
  
  // Process items in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (item, index) => {
      try {
        const result = await withRetry(() => operation(item), retryOptions);
        return { success: true, result, index: i + index };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (!continueOnError) {
          throw err;
        }
        return { success: false, error: err, index: i + index };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      if (result.success) {
        results[result.index] = result.result;
      } else {
        errors.push(result.error);
      }
    }
  }
  
  return { results: results.filter(r => r !== undefined), errors };
}

// Export singleton instances
export const errorLogger = ErrorLogger.getInstance();
export const circuitBreaker = new CircuitBreaker();
export const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute