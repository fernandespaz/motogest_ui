import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { checklistsApi } from './checklists';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('checklistsApi', () => {
  it('list() GETs the checklists for an OS', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await checklistsApi.list(10);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/ordens-servico/10/checklists');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('criar() POSTs a new checklist item for an OS', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, descricao: 'Verificar freios' } });

    const result = await checklistsApi.criar(10, { descricao: 'Verificar freios' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/10/checklists', {
      descricao: 'Verificar freios',
    });
    expect(result.descricao).toBe('Verificar freios');
  });
});
