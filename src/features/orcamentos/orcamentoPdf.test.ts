import { describe, expect, it, vi } from 'vitest';
import { calcularValidade, buildOrcamentoPdfBlob } from './orcamentoPdf';
import { renderOSDocumentPdf } from '@/features/shared/pdf/osDocumentPdf';
import { resolverOficinaParaPdf } from '@/features/shared/pdf/logo';
import { clientesApi } from '@/api/endpoints/clientes';
import { veiculosApi } from '@/api/endpoints/veiculos';
import type { OrcamentoResponse } from '@/api/types';

vi.mock('@/features/shared/pdf/osDocumentPdf', () => ({ renderOSDocumentPdf: vi.fn().mockResolvedValue(new Blob()) }));
vi.mock('@/features/shared/pdf/logo', () => ({
  resolverOficinaParaPdf: vi.fn().mockResolvedValue({ nomeFantasia: 'Ram Tec', razaoSocial: 'Ram Tec LTDA', cnpj: '11222333000199' }),
}));
vi.mock('@/api/endpoints/clientes', () => ({ clientesApi: { get: vi.fn() } }));
vi.mock('@/api/endpoints/veiculos', () => ({ veiculosApi: { get: vi.fn() } }));

describe('buildOrcamentoPdfBlob — consultor', () => {
  // O orçamento também tem consultorNome (ver OrcamentoResponse em
  // openapi.json), mas o PDF simplesmente não passava esse campo adiante —
  // ficava sem consultor nenhum impresso, mesmo tendo o dado disponível.
  it('passes consultorNome through as "consultor"', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);
    const orcamento = {
      id: 5,
      status: 'RASCUNHO',
      clienteId: 1,
      clienteNome: 'Carlos Eduardo',
      veiculoId: 2,
      veiculoPlaca: 'MTG0001',
      consultorNome: 'Ana Consultora',
      itens: [],
    } as OrcamentoResponse;

    await buildOrcamentoPdfBlob(orcamento);

    expect(renderOSDocumentPdf).toHaveBeenCalledWith(expect.objectContaining({ consultor: 'Ana Consultora' }));
  });
});

describe('calcularValidade', () => {
  it('adds validadeDias to the emission date', () => {
    expect(calcularValidade({ dataEmissao: '2026-09-10T12:00:00', validadeDias: 7 })).toBe('17/09/2026');
  });

  it('falls back to createdAt for a quote not yet sent', () => {
    expect(calcularValidade({ createdAt: '2026-09-01T12:00:00', validadeDias: 30 })).toBe('01/10/2026');
  });

  it('prints nothing without a base date or a validity', () => {
    expect(calcularValidade({ validadeDias: 7 })).toBeUndefined();
    expect(calcularValidade({ createdAt: '2026-09-01T12:00:00' })).toBeUndefined();
  });
});

describe('buildOrcamentoPdfBlob — avarias da vistoria de entrada', () => {
  it('traduz região e tipo pra português e não manda linha sem zona ou tipo', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);
    const orcamento = {
      id: 6,
      status: 'RASCUNHO',
      clienteNome: 'Carlos Eduardo',
      itens: [],
      avarias: [
        { id: 1, zona: 'PORTA_DIANTEIRA_ESQ', tipo: 'AMASSADO', descricao: '  amassado fundo ' },
        { id: 2, zona: 'CAPO', tipo: 'ARRANHAO' },
        { id: 3, tipo: 'OUTRO' },
      ],
    } as OrcamentoResponse;

    await buildOrcamentoPdfBlob(orcamento);

    expect(renderOSDocumentPdf).toHaveBeenLastCalledWith(
      expect.objectContaining({
        avarias: [
          { regiao: 'Porta dianteira esquerda', tipo: 'Amassado', descricao: 'amassado fundo' },
          { regiao: 'Capô', tipo: 'Arranhão', descricao: undefined },
        ],
      }),
    );
  });

  it('manda lista vazia (e portanto nenhuma seção no PDF) quando não há avarias', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);
    await buildOrcamentoPdfBlob({ id: 7, status: 'RASCUNHO', itens: [] } as OrcamentoResponse);
    expect(renderOSDocumentPdf).toHaveBeenLastCalledWith(expect.objectContaining({ avarias: [] }));
  });
});
