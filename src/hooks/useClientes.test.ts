import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { clientesApi } from '@/api/endpoints/clientes';
import { useClientes, useVeiculosDoCliente } from './useClientes';

vi.mock('@/api/endpoints/clientes', () => ({
  clientesApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('useClientes hooks', () => {
  it('useClientes() lists clientes through the factory', async () => {
    vi.mocked(clientesApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useClientes(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientesApi.list).toHaveBeenCalled();
  });

  it('useVeiculosDoCliente() stays disabled with an empty array until an id is provided', () => {
    const { result } = renderHook(() => useVeiculosDoCliente(undefined), { wrapper: wrapWithQueryClient() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toEqual([]);
  });

  it('useVeiculosDoCliente() reads the embedded veiculos off the cliente detail', async () => {
    vi.mocked(clientesApi.get).mockResolvedValueOnce({
      id: 1,
      nome: 'Carlos',
      veiculos: [{ id: 10, placa: 'MTG0001' }],
    } as never);
    const { result } = renderHook(() => useVeiculosDoCliente(1), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.data).toEqual([{ id: 10, placa: 'MTG0001' }]));
  });

  it('useVeiculosDoCliente() falls back to an empty array when the cliente has no veiculos field', async () => {
    vi.mocked(clientesApi.get).mockResolvedValueOnce({ id: 1, nome: 'Carlos' } as never);
    const { result } = renderHook(() => useVeiculosDoCliente(1), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(clientesApi.get).toHaveBeenCalledWith(1));
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});
