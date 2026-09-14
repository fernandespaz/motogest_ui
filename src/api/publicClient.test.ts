import { describe, expect, it } from 'vitest';
import { publicApiClient } from './publicClient';

describe('publicApiClient', () => {
  it('is a standalone axios instance with JSON default headers', () => {
    expect(publicApiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('carries no request/response interceptors from the tenant apiClient', () => {
    // The public approval-link pages must never attach a tenant Bearer token,
    // and a 401/403 here must never trigger that other session's logout — see
    // publicClient.ts's own comment.
    expect(publicApiClient.interceptors.request as unknown as { handlers: unknown[] }).toEqual(
      expect.objectContaining({ handlers: [] }),
    );
    expect(publicApiClient.interceptors.response as unknown as { handlers: unknown[] }).toEqual(
      expect.objectContaining({ handlers: [] }),
    );
  });
});
