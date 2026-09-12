import { clientesApi } from '@/api/endpoints/clientes';
import { veiculosApi } from '@/api/endpoints/veiculos';
import { oficinasApi } from '@/api/endpoints/oficinas';
import type { OrcamentoResponse } from '@/api/types';
import { formatCnpj, formatCurrency, formatDateTime, formatDocumento } from '@/lib/formatters';
import { metaFor, orcamentoStatusMeta } from '@/lib/statusMeta';
import { renderOSDocumentPdf } from '@/features/shared/pdf/osDocumentPdf';
import type { OSDocumentLineItem } from '@/features/shared/pdf/types';

function toLineItems(orcamento: OrcamentoResponse, tipo: 'SERVICO' | 'PRODUTO'): OSDocumentLineItem[] {
  return (orcamento.itens ?? [])
    .filter((item) => item.tipoItem === tipo)
    .map((item) => ({
      descricao: item.descricao ?? '',
      quantidade: item.quantidade ?? 0,
      valorUnitario: item.valorUnitario ?? 0,
      valorTotal: item.valorTotal ?? (item.quantidade ?? 0) * (item.valorUnitario ?? 0),
    }));
}

export async function buildOrcamentoPdfBlob(orcamento: OrcamentoResponse): Promise<Blob> {
  const [cliente, veiculo, oficina] = await Promise.all([
    orcamento.clienteId ? clientesApi.get(orcamento.clienteId) : Promise.resolve(null),
    orcamento.veiculoId ? veiculosApi.get(orcamento.veiculoId) : Promise.resolve(null),
    oficinasApi.atual(),
  ]);

  const servicos = toLineItems(orcamento, 'SERVICO');
  const pecas = toLineItems(orcamento, 'PRODUTO');
  const totalServicos = servicos.reduce((sum, i) => sum + i.valorTotal, 0);
  const totalPecas = pecas.reduce((sum, i) => sum + i.valorTotal, 0);

  return renderOSDocumentPdf({
    tipoDocumento: 'Orçamento',
    numero: String(orcamento.id ?? '—'),
    status: metaFor(orcamentoStatusMeta, orcamento.status).label,
    dataEmissao: formatDateTime(orcamento.createdAt),
    oficina: {
      nomeFantasia: oficina.nomeFantasia || oficina.razaoSocial || 'MotoGest',
      razaoSocial: oficina.razaoSocial ?? '',
      cnpj: formatCnpj(oficina.cnpj ?? ''),
    },
    cliente: cliente
      ? {
          nome: cliente.nome ?? '',
          documento: formatDocumento(cliente.documento ?? '', cliente.tipoPessoa === 'PJ' ? 'PJ' : 'PF'),
          tipoPessoa: cliente.tipoPessoa === 'PJ' ? 'PJ' : 'PF',
          endereco: [cliente.logradouro, cliente.numero].filter(Boolean).join(', '),
          bairroCidadeUf: [cliente.bairro, [cliente.cidade, cliente.uf].filter(Boolean).join('/')]
            .filter(Boolean)
            .join(' · '),
          cep: cliente.cep,
          telefone: cliente.telefone,
          email: cliente.email,
        }
      : { nome: orcamento.clienteNome ?? '', documento: '', tipoPessoa: 'PF', endereco: '', bairroCidadeUf: '' },
    veiculo: veiculo
      ? {
          descricao: [veiculo.marca, veiculo.modelo].filter(Boolean).join(' '),
          placa: veiculo.placa ?? '',
          chassi: veiculo.chassi,
          anoFabricacaoModelo: [veiculo.anoFabricacao, veiculo.anoModelo].filter(Boolean).join('/'),
          cor: veiculo.cor,
          kmAtual: veiculo.kmAtual != null ? `${veiculo.kmAtual.toLocaleString('pt-BR')} km` : undefined,
        }
      : { descricao: '', placa: orcamento.veiculoPlaca ?? '' },
    solicitacaoCliente: orcamento.observacoes,
    servicos,
    pecas,
    totalServicos,
    totalPecas,
    totalGeral: orcamento.valorTotal ?? totalServicos + totalPecas,
  });
}
