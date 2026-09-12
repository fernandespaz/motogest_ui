import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { createCrudHooks } from './factory';

interface Widget {
  id: number;
  nome: string;
}

describe('createCrudHooks', () => {
  const api = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const hooks = createCrudHooks<Widget, Widget>('widgets', api);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useList resolves with the API response', async () => {
    api.list.mockResolvedValueOnce({ content: [{ id: 1, nome: 'Parafuso' }] });
    const client = createTestQueryClient();

    const { result } = renderHook(() => hooks.useList(), { wrapper: wrapWithQueryClient(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: [{ id: 1, nome: 'Parafuso' }] });
  });

  it('useDetail stays disabled (no request) until an id is provided', () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => hooks.useDetail(undefined), { wrapper: wrapWithQueryClient(client) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('useCreate invalidates the resource list on success', async () => {
    api.create.mockResolvedValueOnce({ id: 2, nome: 'Porca' });
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => hooks.useCreate(), { wrapper: wrapWithQueryClient(client) });
    result.current.mutate({ id: 0, nome: 'Porca' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['widgets'] });
  });

  it('useCreate surfaces a rejected mutation as isError instead of throwing unhandled', async () => {
    api.create.mockRejectedValueOnce(new Error('validation failed'));
    const client = createTestQueryClient();

    const { result } = renderHook(() => hooks.useCreate(), { wrapper: wrapWithQueryClient(client) });
    result.current.mutate({ id: 0, nome: 'Porca' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('useUpdate invalidates both the list and the specific detail entry', async () => {
    api.update.mockResolvedValueOnce({ id: 2, nome: 'Porca atualizada' });
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => hooks.useUpdate(), { wrapper: wrapWithQueryClient(client) });
    result.current.mutate({ id: 2, payload: { id: 2, nome: 'Porca atualizada' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['widgets'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['widgets', 'detail', 2] });
  });

  it('useRemove invalidates the resource list on success', async () => {
    api.remove.mockResolvedValueOnce(undefined);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => hooks.useRemove(), { wrapper: wrapWithQueryClient(client) });
    result.current.mutate(2);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['widgets'] });
  });
});
