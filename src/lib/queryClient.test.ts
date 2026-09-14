import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useToastStore } from '@/store/toastStore';
import { queryClient } from './queryClient';

describe('queryClient global error handling', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    queryClient.clear();
  });

  it('toasts when a query fails without an explicit silentError meta flag', async () => {
    queryClient.setQueryData(['never-used'], undefined);
    await queryClient
      .fetchQuery({ queryKey: ['broken-query'], queryFn: () => Promise.reject(new Error('boom')) })
      .catch(() => {});

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].variant).toBe('error');
  });

  it('stays silent when the query opts out via meta.silentError', async () => {
    await queryClient
      .fetchQuery({
        queryKey: ['silent-query'],
        queryFn: () => Promise.reject(new Error('boom')),
        meta: { silentError: true },
      })
      .catch(() => {});

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('stays silent for a mutation flagged with meta.silentError', async () => {
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new Error('boom')),
        meta: { silentError: true },
      })
      .execute(undefined)
      .catch(() => {});

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('stays silent for a mutation flagged as already handling its own error UI', async () => {
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new Error('boom')),
        meta: { hasLocalErrorHandling: true },
      })
      .execute(undefined)
      .catch(() => {});

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('toasts for a mutation that forgot to flag local error handling', async () => {
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new Error('boom')),
      })
      .execute(undefined)
      .catch(() => {});

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
