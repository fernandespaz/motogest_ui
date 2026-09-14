import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { useAutoConversaoOrcamentosAprovados } from './useAutoConversaoOrcamentos';

vi.mock('@/api/endpoints/orcamentos', () => ({
  orcamentosApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/api/endpoints/ordensServico', () => ({
  ordensServicoApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    criarAPartirDeOrcamento: vi.fn(),
  },
}));
vi.mock('@/store/toastStore', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('useAutoConversaoOrcamentosAprovados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ permissoes: [] });
  });

  it('never queries when the session lacks ORCAMENTO_READ + ORDEM_SERVICO_WRITE', () => {
    renderHook(() => useAutoConversaoOrcamentosAprovados(), { wrapper: wrapWithQueryClient() });
    expect(orcamentosApi.list).not.toHaveBeenCalled();
  });

  it('leaves a non-APROVADO orçamento alone', async () => {
    useAuthStore.setState({ permissoes: ['ORCAMENTO_READ', 'ORDEM_SERVICO_WRITE'] });
    vi.mocked(orcamentosApi.list).mockResolvedValueOnce({ content: [{ id: 1, status: 'RASCUNHO' }] } as never);

    renderHook(() => useAutoConversaoOrcamentosAprovados(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(orcamentosApi.list).toHaveBeenCalled());
    expect(ordensServicoApi.criarAPartirDeOrcamento).not.toHaveBeenCalled();
  });

  it('auto-converts an APROVADO orçamento into an OS and toasts success', async () => {
    useAuthStore.setState({ permissoes: ['ORCAMENTO_READ', 'ORDEM_SERVICO_WRITE'] });
    vi.mocked(orcamentosApi.list).mockResolvedValueOnce({ content: [{ id: 1, status: 'APROVADO' }] } as never);
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 55 } as never);

    renderHook(() => useAutoConversaoOrcamentosAprovados(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(ordensServicoApi.criarAPartirDeOrcamento).toHaveBeenCalledWith(1, undefined));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('#55')));
  });

  it('does not toast success when the conversion attempt fails, and releases the id for a retry', async () => {
    useAuthStore.setState({ permissoes: ['ORCAMENTO_READ', 'ORDEM_SERVICO_WRITE'] });
    vi.mocked(orcamentosApi.list).mockResolvedValueOnce({ content: [{ id: 1, status: 'APROVADO' }] } as never);
    // The hook retries immediately once the mutation settles (its onError clears
    // the in-flight guard) rather than waiting for the next poll — reject every
    // call so that retry doesn't fall through to an unconfigured mock.
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockRejectedValue(new Error('falha temporária'));

    renderHook(() => useAutoConversaoOrcamentosAprovados(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(ordensServicoApi.criarAPartirDeOrcamento).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
