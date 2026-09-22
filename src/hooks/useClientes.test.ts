import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { clientesApi } from '@/api/endpoints/clientes';
import {
  normalizarPlaca,
  termoBackendPlaca,
  useBuscaVeiculosPorPlaca,
  useClientes,
  useVeiculosDoCliente,
} from './useClientes';

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

describe('useBuscaVeiculosPorPlaca', () => {
  it('searches clientes by the normalized plate and flattens only the vehicles that match', async () => {
    vi.mocked(clientesApi.list).mockResolvedValueOnce({
      content: [
        {
          id: 1,
          nome: 'Fernanda',
          veiculos: [
            { id: 10, placa: 'ABC-1D23' },
            { id: 11, placa: 'XYZ9999' },
          ],
        },
      ],
    } as never);
    const { result } = renderHook(() => useBuscaVeiculosPorPlaca('abc 1d'), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    // Só as 3 letras vão pro backend — casa "ABC-1D23" e "ABC1D23" gravados.
    expect(clientesApi.list).toHaveBeenCalledWith({ busca: 'ABC', size: 50 });
    expect(result.current.data[0]).toMatchObject({ id: 10, clienteId: 1, clienteNome: 'Fernanda' });
  });

  it('stays idle for an empty term', () => {
    const { result } = renderHook(() => useBuscaVeiculosPorPlaca('  -  '), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toEqual([]);
  });
});

describe('normalizarPlaca', () => {
  it('ignores case, hyphens and spaces', () => {
    expect(normalizarPlaca(' abc-1d23 ')).toBe('ABC1D23');
    expect(normalizarPlaca(undefined)).toBe('');
  });
});

describe('termoBackendPlaca', () => {
  it('never sends a term that crosses the hyphen position of a stored plate', () => {
    expect(termoBackendPlaca('ABC1D23')).toBe('ABC');
    expect(termoBackendPlaca('ABC')).toBe('ABC');
    expect(termoBackendPlaca('1D23')).toBe('1D23');
    expect(termoBackendPlaca('AB')).toBe('AB');
  });
});
