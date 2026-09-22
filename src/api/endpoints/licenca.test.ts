import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { licencaApi } from './licenca';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('licencaApi', () => {
  it('atual() GETs the current licença', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { plano: 'BASICO' } });

    const result = await licencaApi.atual();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/licenca/atual');
    expect(result).toEqual({ plano: 'BASICO' });
  });
});
