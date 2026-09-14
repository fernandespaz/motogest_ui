import { describe, expect, it } from 'vitest';
import { renderOSDocumentPdf } from './osDocumentPdf';
import type { OSDocumentData } from './types';

function baseData(overrides: Partial<OSDocumentData> = {}): OSDocumentData {
  return {
    tipoDocumento: 'Ordem de Serviço',
    numero: 'OS-000001',
    status: 'Aberta',
    dataEmissao: '13/09/2026',
    oficina: { nomeFantasia: 'Ram Tec', razaoSocial: 'Ram Tec LTDA', cnpj: '11.222.333/0001-99' },
    cliente: {
      nome: 'Carlos Eduardo',
      documento: '123.456.789-01',
      tipoPessoa: 'PF',
      endereco: 'Rua das Flores, 100',
      bairroCidadeUf: 'Centro / São Paulo / SP',
    },
    veiculo: { descricao: 'Honda CG 160', placa: 'MTG0001' },
    servicos: [],
    pecas: [],
    totalServicos: 0,
    totalPecas: 0,
    totalGeral: 0,
    ...overrides,
  };
}

describe('renderOSDocumentPdf', () => {
  it('renders a minimal document to a PDF blob', async () => {
    const blob = await renderOSDocumentPdf(baseData());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders with a logo embedded in the letterhead', async () => {
    const blob = await renderOSDocumentPdf(
      baseData({
        oficina: {
          nomeFantasia: 'Ram Tec',
          razaoSocial: 'Ram Tec LTDA',
          cnpj: '11.222.333/0001-99',
          logo: {
            dataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            largura: 200,
            altura: 100,
          },
        },
      }),
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it('falls back to a square logo box when the logo has invalid/zero dimensions', async () => {
    const blob = await renderOSDocumentPdf(
      baseData({
        oficina: {
          nomeFantasia: 'Ram Tec',
          razaoSocial: 'Ram Tec LTDA',
          cnpj: '11.222.333/0001-99',
          logo: {
            dataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            largura: 200,
            altura: 0,
          },
        },
      }),
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders line items for serviços and peças with their totals', async () => {
    const blob = await renderOSDocumentPdf(
      baseData({
        servicos: [{ descricao: 'Troca de Óleo', quantidade: 1, valorUnitario: 120, valorTotal: 120 }],
        pecas: [{ descricao: 'Óleo Motor 10W30', quantidade: 4, valorUnitario: 32, valorTotal: 128 }],
        totalServicos: 120,
        totalPecas: 128,
        totalGeral: 248,
      }),
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it('splits a multi-line solicitação do cliente into numbered rows', async () => {
    const blob = await renderOSDocumentPdf(
      baseData({ solicitacaoCliente: 'Barulho no motor\nTroca de óleo atrasada\n' }),
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders the execução section only when OS-specific fields are present', async () => {
    const semExecucao = await renderOSDocumentPdf(baseData());
    const comExecucao = await renderOSDocumentPdf(
      baseData({ consultor: 'Diego', dataAbertura: '01/01/2026', dataConclusao: '02/01/2026' }),
    );
    // With an extra rendered section, the OS-specific document should be a
    // meaningfully different (larger) PDF than the bare Orçamento-shaped one.
    expect(comExecucao.size).not.toBe(semExecucao.size);
  });

  it('renders wrapped observações text when present', async () => {
    const blob = await renderOSDocumentPdf(
      baseData({ observacoes: 'Cliente solicitou retorno em caso de peça em falta.' }),
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders full client contact details when given', async () => {
    const blob = await renderOSDocumentPdf(
      baseData({
        cliente: {
          nome: 'Fernanda Souza',
          documento: '98.765.432/0001-88',
          tipoPessoa: 'PJ',
          endereco: 'Avenida Paulista, 1000',
          bairroCidadeUf: 'Bela Vista / São Paulo / SP',
          cep: '01310-100',
          telefone: '(11) 91234-5678',
          email: 'fernanda@example.com',
        },
        veiculo: {
          descricao: 'Yamaha Fazer 250',
          placa: 'MTG0002',
          chassi: '9BWZZZ377VT004251',
          anoFabricacaoModelo: '2022/2023',
          cor: 'Vermelha',
          kmAtual: '15.000',
        },
        consultor: 'Diego',
        previsaoEntrega: '15/09/2026',
      }),
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});
