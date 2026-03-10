/**
 * Global test setup — runs once before the suite.
 * Verifies backend is reachable before proceeding.
 */
import { beforeAll } from 'vitest';
import { api } from './client';

const HEALTH_MAX_RETRIES = 10;
const HEALTH_RETRY_DELAY = 1000;

beforeAll(async () => {
  let lastError: unknown;
  for (let i = 0; i < HEALTH_MAX_RETRIES; i++) {
    try {
      // Try a lightweight request to verify backend is reachable
      const res = await api.get('/api/v1/auth/me');
      // 401 means server is up (just not authenticated) — that's fine
      if (res.status === 401 || res.status === 200 || res.status === 404) {
        return;
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, HEALTH_RETRY_DELAY));
  }
  throw new Error(
    `Backend not reachable at ${process.env.API_BASE_URL || 'http://localhost:3000'} after ${HEALTH_MAX_RETRIES} attempts. ` +
    `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}, 30_000);
