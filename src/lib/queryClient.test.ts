import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useToastStore } from '@/store/toastStore';
import { ApiForbiddenError } from '@/api/client';
import { usePermissaoNegadaStore } from '@/lib/permissaoNegada';
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

  it('opens the permission dialog (and no generic toast) when a query is denied with 403', async () => {
    usePermissaoNegadaStore.getState().fechar();
    await queryClient
      .fetchQuery({
        queryKey: ['negada'],
        queryFn: () => Promise.reject(new ApiForbiddenError('get', '/api/v1/caixa/movimentos/periodo')),
      })
      .catch(() => {});

    expect(usePermissaoNegadaStore.getState().negada?.codigos).toEqual(['FINANCEIRO_READ']);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('does not open the permission dialog for a 403 on a silentError query', async () => {
    usePermissaoNegadaStore.getState().fechar();
    await queryClient
      .fetchQuery({
        queryKey: ['negada-silenciosa'],
        queryFn: () => Promise.reject(new ApiForbiddenError('get', '/api/v1/produtos')),
        meta: { silentError: true },
      })
      .catch(() => {});

    expect(usePermissaoNegadaStore.getState().negada).toBeNull();
  });

  it('opens the permission dialog for a denied mutation even with local error handling, but not when silentError', async () => {
    usePermissaoNegadaStore.getState().fechar();
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new ApiForbiddenError('post', '/api/v1/produtos/3/movimentacoes')),
        meta: { hasLocalErrorHandling: true },
      })
      .execute(undefined)
      .catch(() => {});
    expect(usePermissaoNegadaStore.getState().negada?.codigos).toEqual(['ESTOQUE_WRITE']);

    usePermissaoNegadaStore.getState().fechar();
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new ApiForbiddenError('post', '/api/v1/produtos/3/movimentacoes')),
        meta: { silentError: true },
      })
      .execute(undefined)
      .catch(() => {});
    expect(usePermissaoNegadaStore.getState().negada).toBeNull();
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
