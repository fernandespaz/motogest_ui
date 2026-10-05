import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { fiscalApi } from '@/api/endpoints/fiscal';
import { useAuthStore } from '@/store/authStore';
import {
  fiscalKeys,
  useCertificadoFiscal,
  useConfiguracaoFiscal,
  useEmitirNfse,
  useNotasFiscais,
} from './useFiscal';

vi.mock('@/api/endpoints/fiscal', () => ({
  fiscalApi: {
    regimes: vi.fn(),
    configuracao: { consultar: vi.fn(), atualizar: vi.fn() },
    certificado: { consultar: vi.fn(), enviar: vi.fn(), remover: vi.fn() },
    nfse: { listar: vi.fn(), buscar: vi.fn(), emitir: vi.fn(), atualizar: vi.fn(), cancelar: vi.fn(), baixarXml: vi.fn() },
  },
}));

const permissoes = (...codigos: string[]) =>
  useAuthStore.setState({ hasPermission: (c: string) => codigos.includes(c) });

describe('permission gating (prohibited-actions #2)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch the configuração for a profile without any fiscal read permission', () => {
    permissoes('CLIENTE_READ');
    const { result } = renderHook(() => useConfiguracaoFiscal(), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(fiscalApi.configuracao.consultar).not.toHaveBeenCalled();
  });

  it('fetches the configuração for FISCAL_CONFIGURAR', async () => {
    permissoes('FISCAL_CONFIGURAR');
    vi.mocked(fiscalApi.configuracao.consultar).mockResolvedValueOnce({ configurada: true } as never);
    const { result } = renderHook(() => useConfiguracaoFiscal(), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('lets a FISCAL_CERTIFICADO-only profile read the certificate but not the configuração (backend allow-lists)', () => {
    permissoes('FISCAL_CERTIFICADO');
    vi.mocked(fiscalApi.certificado.consultar).mockResolvedValue({ enviado: false });
    const wrapper = wrapWithQueryClient();
    const cert = renderHook(() => useCertificadoFiscal(), { wrapper });
    const config = renderHook(() => useConfiguracaoFiscal(), { wrapper });

    expect(cert.result.current.fetchStatus).not.toBe('idle');
    expect(config.result.current.fetchStatus).toBe('idle');
  });

  it('lists notes only with FISCAL_EMITIR', () => {
    permissoes('FISCAL_CONFIGURAR');
    const { result } = renderHook(() => useNotasFiscais({ page: 0 }), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(fiscalApi.nfse.listar).not.toHaveBeenCalled();
  });
});

describe('useEmitirNfse', () => {
  it('invalidates every note query (lists and details) on success', async () => {
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(fiscalApi.nfse.emitir).mockResolvedValueOnce({ id: 1, status: 'AUTORIZADA' } as never);
    const { result } = renderHook(() => useEmitirNfse(), { wrapper: wrapWithQueryClient(client) });

    await result.current.mutateAsync(345);

    expect(fiscalApi.nfse.emitir).toHaveBeenCalledWith(345);
    expect(spy).toHaveBeenCalledWith({ queryKey: fiscalKeys.notas });
  });
});
