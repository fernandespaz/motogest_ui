import { clientesApi } from '@/api/endpoints/clientes';
import { veiculosApi } from '@/api/endpoints/veiculos';
import type { OrdemServicoResponse } from '@/api/types';
import { formatCnpj, formatDateTime, formatDocumento } from '@/lib/formatters';
import { metaFor, ordemServicoStatusMeta } from '@/lib/statusMeta';
import { renderOSDocumentPdf } from '@/features/shared/pdf/osDocumentPdf';
import { resolverOficinaParaPdf } from '@/features/shared/pdf/logo';
import type { OSDocumentLineItem } from '@/features/shared/pdf/types';

function toLineItems(os: OrdemServicoResponse, tipo: 'SERVICO' | 'PRODUTO'): OSDocumentLineItem[] {
  return (os.itens ?? [])
    .filter((item) => item.tipoItem === tipo)
    .map((item) => ({
      descricao: item.descricao ?? '',
      quantidade: item.quantidade ?? 0,
      valorUnitario: item.valorUnitario ?? 0,
      valorTotal: item.valorTotal ?? (item.quantidade ?? 0) * (item.valorUnitario ?? 0),
    }));
}

export async function buildOrdemServicoPdfBlob(os: OrdemServicoResponse): Promise<Blob> {
  const [cliente, veiculo, oficina] = await Promise.all([
    os.clienteId ? clientesApi.get(os.clienteId) : Promise.resolve(null),
    os.veiculoId ? veiculosApi.get(os.veiculoId) : Promise.resolve(null),
    resolverOficinaParaPdf(),
  ]);

  const servicos = toLineItems(os, 'SERVICO');
  const pecas = toLineItems(os, 'PRODUTO');
  const totalServicos = servicos.reduce((sum, i) => sum + i.valorTotal, 0);
  const totalPecas = pecas.reduce((sum, i) => sum + i.valorTotal, 0);

  return renderOSDocumentPdf({
    tipoDocumento: 'Ordem de Serviço',
    numero: os.numero ?? String(os.id ?? '—'),
    status: metaFor(ordemServicoStatusMeta, os.status).label,
    dataEmissao: formatDateTime(os.dataAbertura),
    oficina: {
      nomeFantasia: oficina.nomeFantasia,
      razaoSocial: oficina.razaoSocial,
      cnpj: formatCnpj(oficina.cnpj),
      endereco: oficina.endereco,
      contato: oficina.contato,
      logo: oficina.logo ?? undefined,
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
      : { nome: os.clienteNome ?? '', documento: '', tipoPessoa: 'PF', endereco: '', bairroCidadeUf: '' },
    veiculo: veiculo
      ? {
          descricao: [veiculo.marca, veiculo.modelo].filter(Boolean).join(' '),
          placa: veiculo.placa ?? '',
          chassi: veiculo.chassi,
          anoFabricacaoModelo: [veiculo.anoFabricacao, veiculo.anoModelo].filter(Boolean).join('/'),
          cor: veiculo.cor,
          kmAtual: os.kmEntrada != null ? `${os.kmEntrada.toLocaleString('pt-BR')} km` : undefined,
        }
      : { descricao: '', placa: os.veiculoPlaca ?? '' },
    consultor: os.usuarioResponsavelNome,
    previsaoEntrega: formatDateTime(os.dataPrevisao),
    dataAbertura: formatDateTime(os.dataAbertura),
    dataConclusao: os.dataConclusao ? formatDateTime(os.dataConclusao) : undefined,
    // The mechanic's technical read on the vehicle IS the itens list below (what they
    // registered on assuming the OS) — the client's original complaint lives here.
    solicitacaoCliente: os.observacoes,
    servicos,
    pecas,
    totalServicos,
    totalPecas,
    totalGeral: os.valorTotal ?? totalServicos + totalPecas,
  });
}
