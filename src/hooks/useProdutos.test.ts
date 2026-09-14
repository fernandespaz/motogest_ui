import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { produtosApi } from '@/api/endpoints/produtos';
import { useProdutos, useProdutosAbaixoDoMinimo } from './useProdutos';

vi.mock('@/api/endpoints/produtos', () => ({
  produtosApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    abaixoDoMinimo: vi.fn(),
  },
}));

describe('useProdutos hooks', () => {
  it('useProdutos() lists produtos through the factory', async () => {
    vi.mocked(produtosApi.list).mockResolvedValueOnce({ content: [{ id: 1, nome: 'Óleo Motor' }] } as never);
    const { result } = renderHook(() => useProdutos(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: [{ id: 1, nome: 'Óleo Motor' }] });
  });

  it('useProdutosAbaixoDoMinimo() lists produtos below their minimum stock', async () => {
    vi.mocked(produtosApi.abaixoDoMinimo).mockResolvedValueOnce([{ id: 1, nome: 'Óleo Motor' }] as never);
    const { result } = renderHook(() => useProdutosAbaixoDoMinimo(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1, nome: 'Óleo Motor' }]);
    expect(produtosApi.abaixoDoMinimo).toHaveBeenCalled();
  });
});
