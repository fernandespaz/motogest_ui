import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { authApi } from './auth';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('authApi', () => {
  it('login() POSTs credentials to the login endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { token: 'abc', expiraEmSegundos: 3600 } });

    const result = await authApi.login({ email: 'diego@ramtec.com.br', senha: 'segredo' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'diego@ramtec.com.br',
      senha: 'segredo',
    });
    expect(result).toEqual({ token: 'abc', expiraEmSegundos: 3600 });
  });

  it('logout() POSTs to the logout endpoint (o back-end limpa os cookies HttpOnly)', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: undefined });

    await authApi.logout();

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/logout');
  });
});
