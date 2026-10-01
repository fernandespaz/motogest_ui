import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { caixaApi } from './caixa';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('caixaApi', () => {
  it('list() GETs paginated movimentos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await caixaApi.list({ page: 0, size: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/movimentos', { params: { page: 0, size: 20 } });
  });

  it('periodo() GETs movimentos within a date range', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await caixaApi.periodo('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/movimentos/periodo', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('saldo() GETs and unwraps the saldo number', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { saldo: 1234.5 } });

    const result = await caixaApi.saldo('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/saldo', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toBe(1234.5);
  });

  it('registrar() POSTs a new movimento', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });

    await caixaApi.registrar({ tipo: 'ENTRADA', valor: 100 } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/caixa/movimentos', { tipo: 'ENTRADA', valor: 100 });
  });

  it('faturar() POSTs the payment method to bill an OS into the open caixa session', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ordemServicoId: 5 } });

    const result = await caixaApi.faturar(5, { formaPagamento: 'PIX' });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/caixa/faturamento/5', { formaPagamento: 'PIX' });
    expect(result).toEqual({ ordemServicoId: 5 });
  });
});

describe('caixaApi.sessoes', () => {
  it('listar() GETs paginated sessions', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await caixaApi.sessoes.listar({ page: 0, size: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/sessoes', { params: { page: 0, size: 20 } });
  });

  it('abrir() POSTs the opening request', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'ABERTO' } });

    await caixaApi.sessoes.abrir({ turno: 'Manhã' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/caixa/sessoes', { turno: 'Manhã' });
  });

  it('aberta() returns the open session when one exists', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, status: 'ABERTO' } });

    const result = await caixaApi.sessoes.aberta();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/sessoes/aberta');
    expect(result).toEqual({ id: 1, status: 'ABERTO' });
  });

  it('aberta() resolves to null on the documented 404 (no open session), instead of throwing', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });

    const result = await caixaApi.sessoes.aberta();

    expect(result).toBeNull();
  });

  it('aberta() still throws for any other error — only the documented 404 means "no open session"', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });

    await expect(caixaApi.sessoes.aberta()).rejects.toEqual({ isAxiosError: true, response: { status: 500 } });
  });

  it('buscarPorId() GETs a single session', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 9 } });

    await caixaApi.sessoes.buscarPorId(9);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/sessoes/9');
  });

  it('eventos() GETs the audit trail for a session', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await caixaApi.sessoes.eventos(9);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/sessoes/9/eventos');
  });

  it('fechar() POSTs the closing conference', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9, status: 'FECHADO' } });

    await caixaApi.sessoes.fechar(9, { saldoFinalInformadoDinheiro: 100 } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/caixa/sessoes/9/fechar', { saldoFinalInformadoDinheiro: 100 });
  });

  it('reabrir() POSTs the reopening reason', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9, status: 'ABERTO' } });

    await caixaApi.sessoes.reabrir(9, { motivo: 'Erro no fechamento' });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/caixa/sessoes/9/reabrir', { motivo: 'Erro no fechamento' });
  });

  it('exportar() GETs the session receipt as a blob', async () => {
    const blob = new Blob(['pdf']);
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob });

    const result = await caixaApi.sessoes.exportar(9, 'PDF');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/sessoes/9/exportar', {
      params: { formato: 'PDF' },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
});

describe('caixaApi.relatorios', () => {
  it('diario() GETs the daily summary', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { saldoDia: 100 } });

    await caixaApi.relatorios.diario('2026-01-15');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/relatorios/diario', { params: { data: '2026-01-15' } });
  });

  it('diarioExportar() GETs the daily report as a blob', async () => {
    const blob = new Blob(['xlsx']);
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob });

    const result = await caixaApi.relatorios.diarioExportar('2026-01-15', 'XLSX');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/relatorios/diario/exportar', {
      params: { data: '2026-01-15', formato: 'XLSX' },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });

  it('periodo() GETs the period summary', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { saldoPeriodo: 500 } });

    await caixaApi.relatorios.periodo('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/relatorios/periodo', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
  });

  it('periodoExportar() GETs the period report as a blob', async () => {
    const blob = new Blob(['pdf']);
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob });

    const result = await caixaApi.relatorios.periodoExportar('2026-01-01', '2026-01-31', 'PDF');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/relatorios/periodo/exportar', {
      params: { inicio: '2026-01-01', fim: '2026-01-31', formato: 'PDF' },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
});
