import axios from 'axios';

/**
 * Axios instance for unauthenticated public endpoints (e.g. the orçamento
 * approval link opened by a client). Deliberately has none of api/client.ts's
 * interceptors: it must never attach a tenant Bearer token, and a 401/403
 * here must never trigger that other session's logout-and-redirect — the
 * person opening this link may not be a MotoGest user at all.
 */
export const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});
