import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { veiculosApi } from '@/api/endpoints/veiculos';
import { veiculosKeys, useVeiculos, useVeiculo, useCreateVeiculo, useUpdateVeiculo, useDeleteVeiculo } from './useVeiculos';

vi.mock('@/api/endpoints/veiculos', () => ({
  veiculosApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('useVeiculos hooks', () => {
  it('useVeiculos() lists veículos through the factory', async () => {
    vi.mocked(veiculosApi.list).mockResolvedValueOnce({ content: [{ id: 1, placa: 'MTG0001' }] } as never);
    const { result } = renderHook(() => useVeiculos(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: [{ id: 1, placa: 'MTG0001' }] });
  });

  it('useVeiculo() fetches a single veículo by id', async () => {
    vi.mocked(veiculosApi.get).mockResolvedValueOnce({ id: 1, placa: 'MTG0001' } as never);
    const { result } = renderHook(() => useVeiculo(1), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1, placa: 'MTG0001' });
  });

  it('useCreateVeiculo() invalidates the veículos list on success', async () => {
    vi.mocked(veiculosApi.create).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateVeiculo(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ placa: 'MTG0002' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: veiculosKeys.all });
  });

  it('useUpdateVeiculo() invalidates the veículos detail on success', async () => {
    vi.mocked(veiculosApi.update).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateVeiculo(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 2, payload: { placa: 'MTG0003' } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: veiculosKeys.detail(2) });
  });

  it('useDeleteVeiculo() invalidates the veículos list on success', async () => {
    vi.mocked(veiculosApi.remove).mockResolvedValueOnce(undefined);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteVeiculo(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(2);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: veiculosKeys.all });
  });
});
