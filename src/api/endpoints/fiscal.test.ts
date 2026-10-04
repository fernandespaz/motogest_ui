import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { fiscalApi } from './fiscal';

vi.mock('../client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('fiscalApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('regimes() GETs the regime list the select is built from', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ codigo: 'MEI', descricao: 'MEI' }] });
    const result = await fiscalApi.regimes();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/fiscal/regimes-tributarios');
    expect(result).toEqual([{ codigo: 'MEI', descricao: 'MEI' }]);
  });

  it('configuracao.atualizar() PUTs the full request body', async () => {
    const payload = { emissaoHabilitada: false, ambiente: 'HOMOLOGACAO' as const };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: {} });
    await fiscalApi.configuracao.atualizar(payload);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/fiscal/configuracao', payload);
  });

  it('certificado.enviar() sends arquivo and senha as multipart fields — never in the URL', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { enviado: true } });
    const arquivo = new File(['x'], 'cert.pfx');
    await fiscalApi.certificado.enviar(arquivo, 'segredo');

    const [url, body, config] = vi.mocked(apiClient.put).mock.calls[0];
    expect(url).toBe('/api/v1/fiscal/certificado');
    expect(url).not.toContain('segredo');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('arquivo')).toBe(arquivo);
    expect((body as FormData).get('senha')).toBe('segredo');
    // Content-Type fica pro navegador (boundary) — o default JSON do client não pode vencer.
    expect(config).toEqual({ headers: { 'Content-Type': undefined } });
  });

  it('nfse.emitir() POSTs without a body and with a timeout long enough for the government call', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'AUTORIZADA' } });
    const nota = await fiscalApi.nfse.emitir(345);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/fiscal/nfse/ordens-servico/345', undefined, {
      timeout: 40_000,
    });
    expect(nota.status).toBe('AUTORIZADA');
  });

  it('nfse.listar() filters by OS and forwards pagination', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await fiscalApi.nfse.listar({ ordemServicoId: 9, page: 0, size: 20 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/fiscal/nfse', {
      params: { ordemServicoId: 9, page: 0, size: 20 },
    });
  });

  it('nfse.cancelar() POSTs the justificativa', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    await fiscalApi.nfse.cancelar(12, { justificativa: 'Servico emitido em duplicidade' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/fiscal/nfse/12/cancelar',
      { justificativa: 'Servico emitido em duplicidade' },
      { timeout: 40_000 },
    );
  });

  it('nfse.baixarXml() fetches a blob and takes the filename from Content-Disposition', async () => {
    const blob = new Blob(['<xml/>']);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="nfse-55.xml"' },
    });
    const result = await fiscalApi.nfse.baixarXml(12);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/fiscal/nfse/12/xml', { responseType: 'blob' });
    expect(result).toEqual({ blob, filename: 'nfse-55.xml' });
  });

  it('nfse.baixarXml() falls back to a default filename when the header is missing', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: new Blob(['x']), headers: {} });
    expect((await fiscalApi.nfse.baixarXml(7)).filename).toBe('nfse-7.xml');
  });
});
