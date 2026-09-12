import axios from 'axios';

/**
 * Separate Axios instance for platform-root calls (X-Admin-Token) that must
 * never touch tenant auth: no automatic Authorization header, and a 401 here
 * must NOT trigger the tenant session's logout-and-redirect (see api/client.ts) —
 * a wrong/missing admin token is an error for the Root Console screen alone.
 */
export const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});
