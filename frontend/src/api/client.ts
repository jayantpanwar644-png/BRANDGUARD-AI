const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// In-flight request deduplication map to prevent simultaneous duplicate requests
const inFlightRequests = new Map<string, Promise<any>>();

// Short-lived in-memory GET cache (3-5 seconds TTL) to eliminate rapid tab-switching refetches
interface CacheEntry {
  data: any;
  timestamp: number;
}
const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3500; // 3.5 seconds

export interface ApiRequestOptions extends RequestInit {
  skipCache?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('brandguard_token');
  const cacheKey = `${method}:${endpoint}:${token || 'anon'}`;

  // 1. Return short-lived cached GET data if still fresh and not explicitly skipped
  if (method === 'GET' && !options.skipCache) {
    const cached = getCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }

    // 2. Return in-flight promise if the exact same GET request is currently pending
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }
  }

  // 3. Clear cache on mutations (POST, PUT, DELETE, PATCH)
  if (method !== 'GET') {
    getCache.clear();
  }

  const executeRequest = async (): Promise<T> => {
    try {
      const headers = new Headers(options.headers || {});
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // If not FormData, default to application/json
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // If not on login page, redirect
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('brandguard_token');
          localStorage.removeItem('brandguard_user');
          window.location.href = '/login';
        }
      }

      if (!response.ok) {
        let errorDetail = `HTTP error ${response.status}`;
        let errorPayload: any = null;
        try {
          const responseClone = response.clone();
          try {
            const errorData = await response.json();
            errorPayload = errorData;
            if (typeof errorData.detail === 'string') {
              errorDetail = errorData.detail;
            } else if (errorData.detail && typeof errorData.detail === 'object') {
              if (typeof errorData.detail.message === 'string') {
                errorDetail = errorData.detail.message;
              } else if (Array.isArray(errorData.detail)) {
                errorDetail = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
              } else {
                errorDetail = JSON.stringify(errorData.detail);
              }
            } else if (typeof errorData.message === 'string') {
              errorDetail = errorData.message;
            } else {
              errorDetail = JSON.stringify(errorData);
            }
          } catch {
            errorDetail = await responseClone.text();
          }
        } catch {
          errorDetail = `HTTP error ${response.status}: ${response.statusText}`;
        }
        const err: any = new Error(String(errorDetail || `HTTP error ${response.status}`));
        err.status = response.status;
        err.payload = errorPayload;
        throw err;
      }

      // Handle blob or json
      const contentType = response.headers.get('content-type');
      let result: any;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = response as any;
      }

      // Cache fresh GET results
      if (method === 'GET' && !options.skipCache) {
        getCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result as T;
    } finally {
      if (method === 'GET') {
        inFlightRequests.delete(cacheKey);
      }
    }
  };

  if (method === 'GET') {
    const promise = executeRequest();
    inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  return executeRequest();
}
