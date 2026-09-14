import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { dashboardApi } from '@/api/endpoints/dashboard';
import { useDashboard } from './useDashboard';

vi.mock('@/api/endpoints/dashboard', () => ({
  dashboardApi: { gerar: vi.fn() },
}));

describe('useDashboard', () => {
  it('fetches the dashboard summary', async () => {
    vi.mocked(dashboardApi.gerar).mockResolvedValueOnce({ totalClientes: 10 } as never);
    const { result } = renderHook(() => useDashboard(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalClientes: 10 });
  });
});
