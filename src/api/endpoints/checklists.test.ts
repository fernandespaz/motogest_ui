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

  it('criar() POSTs a new checklist for an OS', async () => {
    const checklist = {
      tipo: 'ENTRADA' as const,
      itens: [{ descricao: 'Verificar freios', situacao: 'OK' as const }],
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, ...checklist } });

    const result = await checklistsApi.criar(10, checklist);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/10/checklists', checklist);
    expect(result.itens?.[0].descricao).toBe('Verificar freios');
  });
});
