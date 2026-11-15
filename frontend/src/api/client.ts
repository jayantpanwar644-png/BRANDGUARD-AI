const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('brandguard_token');
  
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
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response as any;
}
