import { describe, expect, it, vi } from 'vitest';
import { buildOrdemServicoPdfBlob } from './ordemServicoPdf';
import { renderOSDocumentPdf } from '@/features/shared/pdf/osDocumentPdf';
import { resolverOficinaParaPdf } from '@/features/shared/pdf/logo';
import { clientesApi } from '@/api/endpoints/clientes';
import { veiculosApi } from '@/api/endpoints/veiculos';
import type { OrdemServicoResponse } from '@/api/types';

vi.mock('@/features/shared/pdf/osDocumentPdf', () => ({ renderOSDocumentPdf: vi.fn().mockResolvedValue(new Blob()) }));
vi.mock('@/features/shared/pdf/logo', () => ({
  resolverOficinaParaPdf: vi.fn().mockResolvedValue({ nomeFantasia: 'Ram Tec', razaoSocial: 'Ram Tec LTDA', cnpj: '11222333000199' }),
}));
vi.mock('@/api/endpoints/clientes', () => ({ clientesApi: { get: vi.fn() } }));
vi.mock('@/api/endpoints/veiculos', () => ({ veiculosApi: { get: vi.fn() } }));

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
