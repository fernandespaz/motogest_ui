import { describe, expect, it, vi } from 'vitest';
import { buildOrdemServicoPdfBlob } from './ordemServicoPdf';
import { renderOSDocumentPdf } from '@/features/shared/pdf/osDocumentPdf';
import { resolverOficinaParaPdf } from '@/features/shared/pdf/logo';
import { clientesApi } from '@/api/endpoints/clientes';
import { veiculosApi } from '@/api/endpoints/veiculos';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import { useAuthStore } from '@/store/authStore';
import type { OrdemServicoResponse } from '@/api/types';

vi.mock('@/features/shared/pdf/osDocumentPdf', () => ({ renderOSDocumentPdf: vi.fn().mockResolvedValue(new Blob()) }));
vi.mock('@/features/shared/pdf/logo', () => ({
  resolverOficinaParaPdf: vi.fn().mockResolvedValue({ nomeFantasia: 'Ram Tec', razaoSocial: 'Ram Tec LTDA', cnpj: '11222333000199' }),
}));
vi.mock('@/api/endpoints/clientes', () => ({ clientesApi: { get: vi.fn() } }));
vi.mock('@/api/endpoints/veiculos', () => ({ veiculosApi: { get: vi.fn() } }));
vi.mock('@/api/endpoints/orcamentos', () => ({ orcamentosApi: { get: vi.fn() } }));
vi.mock('@/store/authStore', () => ({ useAuthStore: { getState: vi.fn() } }));

const os: OrdemServicoResponse = {
  id: 9,
  numero: 'OS-000009',
  status: 'APROVADA',
  clienteId: 1,
  clienteNome: 'Carlos Eduardo',
  veiculoId: 2,
  veiculoPlaca: 'MTG0001',
  consultorNome: 'Ana Consultora',
  usuarioResponsavelNome: 'Marcos Mecânico',
  itens: [],
};

describe('buildOrdemServicoPdfBlob — mapeamento consultor vs técnico', () => {
  // Bug real: os dois campos eram enviados como a mesma prop `consultor`, e o
  // PDF impresso mostrava o mecânico no lugar do consultor no cabeçalho.
  // "Consultor" (rastreabilidade de faturamento) e "Tec. responsável"
  // (quem executou) precisam vir de campos diferentes da OS.
  it('sends consultorNome as "consultor" and usuarioResponsavelNome as "tecnicoResponsavel", never swapped', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);

    await buildOrdemServicoPdfBlob(os);

    expect(renderOSDocumentPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        consultor: 'Ana Consultora',
        tecnicoResponsavel: 'Marcos Mecânico',
      }),
    );
  });
});

describe('buildOrdemServicoPdfBlob — opções de recibo (Faturar no Caixa)', () => {
  it('defaults to "Ordem de Serviço" and no selo de pagamento when opções is omitted', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);

    await buildOrdemServicoPdfBlob(os);

    expect(renderOSDocumentPdf).toHaveBeenCalledWith(
      expect.objectContaining({ tipoDocumento: 'Ordem de Serviço', pagamento: undefined }),
    );
  });

  it('passes tipoDocumento and pagamento through when the caller prints a paid receipt', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);

    await buildOrdemServicoPdfBlob(os, {
      tipoDocumento: 'Recibo de Pagamento',
      pagamento: { formaPagamento: 'Pix', dataPagamento: '27/09/2026 10:00', caixaSessaoIdentificador: 'CX-0001' },
    });

    expect(renderOSDocumentPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoDocumento: 'Recibo de Pagamento',
        pagamento: { formaPagamento: 'Pix', dataPagamento: '27/09/2026 10:00', caixaSessaoIdentificador: 'CX-0001' },
      }),
    );
  });
});

describe('buildOrdemServicoPdfBlob — combustível do orçamento de origem', () => {
  async function gerar(permitido: boolean) {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);
    vi.mocked(useAuthStore.getState).mockReturnValue({ hasPermission: () => permitido } as never);
    await buildOrdemServicoPdfBlob({ id: 1, orcamentoId: 9, itens: [] } as never);
  }

  it('prints the level registered on the source orçamento', async () => {
    vi.mocked(orcamentosApi.get).mockResolvedValue({ nivelCombustivel: 50 } as never);
    await gerar(true);
    expect(renderOSDocumentPdf).toHaveBeenLastCalledWith(
      expect.objectContaining({ veiculo: expect.objectContaining({ nivelCombustivel: 50 }) }),
    );
  });

  it('skips the fetch without ORCAMENTO_READ', async () => {
    vi.mocked(orcamentosApi.get).mockClear();
    await gerar(false);
    expect(orcamentosApi.get).not.toHaveBeenCalled();
  });

  it('still renders when the orçamento fetch fails', async () => {
    vi.mocked(orcamentosApi.get).mockRejectedValue(new Error('x'));
    await gerar(true);
    expect(renderOSDocumentPdf).toHaveBeenLastCalledWith(
      expect.objectContaining({ veiculo: expect.objectContaining({ nivelCombustivel: undefined }) }),
    );
  });
});

describe('buildOrdemServicoPdfBlob — avarias da vistoria de entrada', () => {
  // O backend copia as avarias do orçamento pra OS na conversão; a OS impressa
  // precisa mostrar o estado em que o veículo entrou.
  it('imprime as avarias da própria OS, em português', async () => {
    vi.mocked(clientesApi.get).mockResolvedValue(null as never);
    vi.mocked(veiculosApi.get).mockResolvedValue(null as never);

    await buildOrdemServicoPdfBlob({
      ...os,
      avarias: [{ id: 1, zona: 'PARA_CHOQUE_TRASEIRO', tipo: 'TRINCA', descricao: 'trinca no canto' }],
    });

    expect(renderOSDocumentPdf).toHaveBeenLastCalledWith(
      expect.objectContaining({
        avarias: [{ regiao: 'Para-choque traseiro', tipo: 'Trinca', descricao: 'trinca no canto' }],
      }),
    );
  });
});
