import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { dashboardApi } from './dashboard';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('dashboardApi', () => {
  it('gerar() GETs the dashboard summary', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { totalClientes: 10 } });

    const result = await dashboardApi.gerar();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/dashboard');
    expect(result).toEqual({ totalClientes: 10 });
  });
});
