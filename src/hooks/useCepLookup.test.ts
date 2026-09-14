import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buscarEnderecoPorCep } from '@/lib/cep';
import { useCepLookup } from './useCepLookup';

vi.mock('@/lib/cep', () => ({
  buscarEnderecoPorCep: vi.fn(),
}));

describe('useCepLookup', () => {
  it('resolves to null without calling the lookup for an incomplete CEP', async () => {
    const { result } = renderHook(() => useCepLookup());

    let resolved;
    await act(async () => {
      resolved = await result.current.buscar('0131');
    });

    expect(resolved).toBeNull();
    expect(buscarEnderecoPorCep).not.toHaveBeenCalled();
  });

  it('toggles `buscando` around a real lookup and returns the address', async () => {
    vi.mocked(buscarEnderecoPorCep).mockResolvedValueOnce({
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    });
    const { result } = renderHook(() => useCepLookup());
    expect(result.current.buscando).toBe(false);

    let resolved;
    await act(async () => {
      resolved = await result.current.buscar('01310100');
    });

    expect(buscarEnderecoPorCep).toHaveBeenCalledWith('01310100');
    expect(resolved).toEqual({
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    });
    await waitFor(() => expect(result.current.buscando).toBe(false));
  });

  it('resets `buscando` to false even when the lookup fails', async () => {
    vi.mocked(buscarEnderecoPorCep).mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useCepLookup());

    await act(async () => {
      await expect(result.current.buscar('01310100')).rejects.toThrow('network down');
    });

    expect(result.current.buscando).toBe(false);
  });
});
