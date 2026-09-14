import { describe, expect, it } from 'vitest';
import { adminApiClient } from './adminClient';

describe('adminApiClient', () => {
  it('is a standalone axios instance with JSON default headers', () => {
    expect(adminApiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('carries no request/response interceptors from the tenant apiClient', () => {
    // Root Console calls must never inherit apiClient's auth-header injection or
    // 401/403 logout-and-redirect handling — see adminClient.ts's own comment.
    expect(adminApiClient.interceptors.request as unknown as { handlers: unknown[] }).toEqual(
      expect.objectContaining({ handlers: [] }),
    );
    expect(adminApiClient.interceptors.response as unknown as { handlers: unknown[] }).toEqual(
      expect.objectContaining({ handlers: [] }),
    );
  });
});
