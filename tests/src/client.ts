/**
 * Robust HTTP client for black-box API testing.
 *
 * - Retries on ECONNREFUSED (backend may be starting up)
 * - Returns parsed body + status + headers for full assertion control
 * - Never throws on 4xx/5xx — lets the test assert the status
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  params?: Record<string, string>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token, params } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      let parsed: T;
      const contentType = res.headers.get('content-type') ?? '';
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        parsed = undefined as T;
      } else if (contentType.includes('application/json')) {
        parsed = (await res.json()) as T;
      } else {
        parsed = (await res.text()) as T;
      }
      return { status: res.status, headers: res.headers, body: parsed };
    } catch (err: unknown) {
      lastError = err;
      const isConnectionError =
        err instanceof TypeError ||
        (err instanceof Error && (
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('fetch failed') ||
          err.message.includes('network')
        ));
      if (isConnectionError && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// --- Convenience methods ---

export const api = {
  get: <T = unknown>(path: string, token?: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET', token, params }),

  post: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body, token }),

  patch: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body, token }),

  delete: <T = unknown>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
};
