/**
 * Retry Logic for Failed API Calls
 *
 * Provides automatic retry with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
  onRetry: () => {},
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (Too Many Requests)
  if (error.status === 429) {
    return true;
  }

  // Custom retryable error codes
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = Math.min(
    baseDelay * Math.pow(backoffMultiplier, attempt),
    maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;

  return delay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt === opts.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.baseDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`);

      // Call retry callback
      opts.onRetry(attempt + 1, error);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry with custom retry condition
 */
export async function withRetryIf<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: any) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === opts.maxRetries || !shouldRetry(error)) {
        break;
      }

      const delay = calculateDelay(
        attempt,
        opts.baseDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      opts.onRetry(attempt + 1, error);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry decorator for class methods
 */
export function retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return await withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * React hook for retry logic
 */
import { useState, useCallback } from 'react';

export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      const result = await withRetry(fn, {
        ...options,
        onRetry: (attempt, err) => {
          setRetryCount(attempt);
          options.onRetry?.(attempt, err);
        },
      });

      setData(result);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn, options]);

  return {
    execute,
    loading,
    error,
    data,
    retryCount,
  };
}

/**
 * Retry Supabase queries
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<T> {
  const result = await withRetry(
    async () => {
      const { data, error } = await queryFn();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned');
      }

      return data;
    },
    {
      ...options,
      retryableErrors: [
        'PGRST301', // JWT expired
        'PGRST116', // Row not found (may be timing issue)
        '08003', // Connection exception
        '08006', // Connection failure
        '57P03', // Cannot connect now
        ...DEFAULT_OPTIONS.retryableErrors,
      ],
    }
  );

  return result;
}

/**
 * Retry Edge Function invocations
 */
export async function retryEdgeFunction<T>(
  invokeFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<T> {
  return await withRetry(
    async () => {
      const { data, error } = await invokeFn();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from Edge Function');
      }

      return data;
    },
    {
      maxRetries: 2, // Edge Functions are usually fast, fewer retries
      baseDelay: 500,
      ...options,
    }
  );
}

/**
 * Batch retry - retry multiple operations independently
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  return await Promise.all(
    operations.map((op) => withRetry(op, options))
  );
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private resetTimeout = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn('Circuit breaker opened');
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'closed';
    console.log('Circuit breaker closed');
  }

  getState() {
    return this.state;
  }
}
