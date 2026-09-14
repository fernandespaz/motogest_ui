import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { oficinasAdminApi } from '@/api/endpoints/oficinas';
import { oficinasAdminKeys, useOficinasAdmin, useCriarOficinaAdmin } from './useOficinasAdmin';

vi.mock('@/api/endpoints/oficinas', () => ({
  oficinasAdminApi: { list: vi.fn(), criar: vi.fn() },
}));

describe('useOficinasAdmin', () => {
  it('stays disabled without an admin token, never touching the network', () => {
    const { result } = renderHook(() => useOficinasAdmin(''), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(oficinasAdminApi.list).not.toHaveBeenCalled();
  });

  it('lists oficinas once a token is provided', async () => {
    vi.mocked(oficinasAdminApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useOficinasAdmin('secret-token'), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(oficinasAdminApi.list).toHaveBeenCalledWith('secret-token', undefined);
  });
});

describe('useCriarOficinaAdmin', () => {
  it('invalidates the admin oficinas list on success', async () => {
    vi.mocked(oficinasAdminApi.criar).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCriarOficinaAdmin('secret-token'), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ razaoSocial: 'Ram Tec' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(oficinasAdminApi.criar).toHaveBeenCalledWith('secret-token', { razaoSocial: 'Ram Tec' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: oficinasAdminKeys.all });
  });
});
