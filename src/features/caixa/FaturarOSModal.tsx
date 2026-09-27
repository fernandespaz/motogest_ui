import { useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, ReadOnlyField } from '@/components/ui/Field';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useVeiculo } from '@/hooks/useVeiculos';
import { useFaturarOrdemServico } from '@/hooks/useFinanceiro';
import { onlyDigits, formatCpfOuCnpj, formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { FORMAS_PAGAMENTO, FORMA_PAGAMENTO_LABEL } from '@/lib/formaPagamento';
import { buildOrdemServicoPdfBlob } from '@/features/ordens-servico/ordemServicoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { FormaPagamento, OrdemServicoResponse } from '@/api/types';

/**
 * Busca a OS de um cliente pelo CPF/CNPJ pra faturar sem precisar abrir a
 * tela completa de Ordens de Serviço — pensado pro Perfil Caixa, que pode não
 * ter ORDEM_SERVICO_READ/WRITE (a busca aqui reaproveita o mesmo GET
 * /ordens-servico com o filtro `clienteDocumento`, então continua sujeita à
 * permissão real do backend nesse endpoint).
 *
 * Seleção e confirmação são duas etapas separadas — clicar numa linha só
 * marca qual OS está selecionada (destacada); o "Faturar OS" abaixo da
 * tabela é quem avança pra escolha da forma de pagamento, pra faturar não
 * disparar sozinho num clique acidental na linha.
 */
export function FaturarOSModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [documentoInput, setDocumentoInput] = useState('');
  const [documentoBuscado, setDocumentoBuscado] = useState('');
  const [osSelecionada, setOsSelecionada] = useState<OrdemServicoResponse | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [processando, setProcessando] = useState(false);

  // OrdemServicoResponse só traz a placa — marca/modelo/cor vêm daqui pra
  // enriquecer o resumo de conferência antes de faturar. Mesma ressalva da
  // busca por CPF: exige a permissão real do backend nesse endpoint (VEICULO_READ).
  const veiculoSelecionado = useVeiculo(osSelecionada?.veiculoId ?? undefined);

  // Só CONCLUIDA é faturável — ENTREGUE só existe vindo de FATURADO (o
  // veículo só é liberado depois de pago), então uma OS Entregue já é sempre
  // Faturada antes; não há razão pra buscar por ENTREGUE aqui.
  const concluidas = useOrdensServico(
    { clienteDocumento: documentoBuscado, status: 'CONCLUIDA', size: 20 },
    { enabled: !!documentoBuscado },
  );
  const faturar = useFaturarOrdemServico();

  const carregando = concluidas.isFetching;
  const resultados = concluidas.data?.content ?? [];
  // Sem isso, uma busca que falha (ex.: 403 por falta de ORDEM_SERVICO_READ)
  // renderiza a mesma mensagem de "cliente sem OS faturável" — o toast de erro
  // já avisa, mas o estado vazio da tabela não pode reforçar a confusão.
  const falhaNaBusca = concluidas.isError;

  function fechar() {
    setDocumentoInput('');
    setDocumentoBuscado('');
    setOsSelecionada(null);
    setConfirmando(false);
    setFormaPagamento('DINHEIRO');
    onClose();
  }

  function handleDocumentoChange(valor: string) {
    setDocumentoInput(formatCpfOuCnpj(valor));
  }

  function buscar() {
    setOsSelecionada(null);
    setConfirmando(false);
    setDocumentoBuscado(onlyDigits(documentoInput));
  }

  function voltarParaBusca() {
    setConfirmando(false);
  }

  // Fatura e já abre o recibo pra impressão numa tacada só — reaproveita o
  // mesmo template de recibo usado em Ordens de Serviço (busca cliente/
  // veículo/oficina e monta o PDF com os itens, datas e totais), marcado
  // como "Recibo de Pagamento" com o selo PAGO NO CAIXA (ver osDocumentPdf.ts).
  // "Data de entrega" de verdade ainda não existe no schema (a OS aqui está
  // Concluída, antes de Faturado/Entregue), então o recibo mostra a previsão
  // de entrega no lugar, não uma data de entrega já ocorrida.
  //
  // openPdfInNewTab abre a aba em branco JÁ no clique (antes de qualquer
  // await) pra não ser bloqueada como pop-up — por isso o faturamento em si
  // roda DENTRO do callback que ela chama, não antes dele.
  async function confirmarFaturamento() {
    if (!osSelecionada?.id) return;
    setProcessando(true);
    // Marca se o faturamento em si já foi confirmado antes de qualquer falha
    // — se o PDF quebrar depois disso, o erro é só do recibo, não do
    // pagamento (que já está registrado no caixa e não deve ser reportado
    // como se tivesse falhado).
    let faturado = false;
    try {
      await openPdfInNewTab(async () => {
        const resultado = await faturar.mutateAsync({
          ordemServicoId: osSelecionada.id!,
          payload: { formaPagamento },
        });
        faturado = true;
        toast.success(
          `OS ${osSelecionada.numero} faturada — ${formatCurrency(resultado.valor)} lançados no caixa ${resultado.caixaSessaoIdentificador ?? ''}.`,
        );
        return buildOrdemServicoPdfBlob(osSelecionada, {
          tipoDocumento: 'Recibo de Pagamento',
          pagamento: {
            formaPagamento: FORMA_PAGAMENTO_LABEL[formaPagamento],
            dataPagamento: formatDateTime(resultado.recebidoEm),
            caixaSessaoIdentificador: resultado.caixaSessaoIdentificador,
          },
        });
      }, `recibo-${osSelecionada.numero ?? osSelecionada.id}.pdf`);
      fechar();
    } catch (error) {
      if (faturado) {
        toast.error('Faturamento concluído, mas não foi possível abrir o recibo para impressão.');
        fechar();
      } else {
        toast.error(extractErrorMessage(error, 'Não foi possível faturar a OS no caixa.'));
      }
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Modal open={open} onClose={fechar} title="Faturar OS" size="lg">
      <div className="flex flex-col gap-4">
        {confirmando && osSelecionada ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-surface-alt p-4">
              <p className="mb-3 font-semibold text-ink">OS {osSelecionada.numero}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ReadOnlyField label="Cliente" value={osSelecionada.clienteNome ?? '—'} />
                <ReadOnlyField
                  label="CPF/CNPJ"
                  value={osSelecionada.clienteDocumento ? formatCpfOuCnpj(osSelecionada.clienteDocumento) : '—'}
                />
                <ReadOnlyField label="Consultor" value={osSelecionada.consultorNome ?? '—'} />
                <ReadOnlyField
                  label="Veículo"
                  value={
                    veiculoSelecionado.data
                      ? `${[veiculoSelecionado.data.marca, veiculoSelecionado.data.modelo].filter(Boolean).join(' ')} — ${osSelecionada.veiculoPlaca ?? ''}`
                      : (osSelecionada.veiculoPlaca ?? '—')
                  }
                />
                <ReadOnlyField label="Entrada" value={formatDate(osSelecionada.dataAbertura)} />
                <ReadOnlyField label="Valor" value={formatCurrency(osSelecionada.valorTotal)} />
              </div>
            </div>
            <Select
              label="Forma de pagamento"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
              disabled={processando}
            >
              {FORMAS_PAGAMENTO.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {/* O recibo abre sozinho, em nova aba, assim que o faturamento é
                confirmado — não existe mais um botão separado de "imprimir"
                pra não competir por atenção com o resumo da OS. */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={voltarParaBusca} disabled={processando}>
                Voltar
              </Button>
              <Button variant="success" size="lg" onClick={confirmarFaturamento} loading={processando}>
                <Receipt size={18} /> {processando ? 'Gerando recibo de pagamento...' : 'Confirmar faturamento'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="CPF/CNPJ do cliente"
                placeholder="000.000.000-00"
                value={documentoInput}
                onChange={(e) => handleDocumentoChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
              <Button onClick={buscar} disabled={!documentoInput.trim()}>
                <Search size={16} /> Buscar
              </Button>
            </div>

            {!!documentoBuscado && (
              <>
                <DataTable<OrdemServicoResponse>
                  loading={carregando}
                  rows={resultados}
                  rowKey={(row) => row.id!}
                  onRowClick={(row) => setOsSelecionada(row)}
                  isRowSelected={(row) => row.id === osSelecionada?.id}
                  emptyTitle={
                    falhaNaBusca
                      ? 'Não foi possível buscar as OS deste cliente'
                      : 'Nenhuma OS concluída encontrada para este documento'
                  }
                  emptyDescription={
                    falhaNaBusca
                      ? 'A busca falhou — verifique sua permissão de acesso a Ordens de Serviço ou tente novamente.'
                      : 'Só aparecem aqui ordens de serviço Concluídas, prontas para faturar.'
                  }
                  columns={[
                    { header: 'OS', render: (row) => row.numero },
                    { header: 'Cliente', render: (row) => row.clienteNome, hideBelow: 'sm' },
                    { header: 'Veículo', render: (row) => row.veiculoPlaca, hideBelow: 'md' },
                    {
                      header: 'Status',
                      render: (row) => {
                        const meta = metaFor(ordemServicoStatusMeta, row.status);
                        return <Badge tone={meta.tone}>{meta.label}</Badge>;
                      },
                    },
                    { header: 'Valor', render: (row) => formatCurrency(row.valorTotal) },
                  ]}
                />
                {resultados.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => setConfirmando(true)} disabled={!osSelecionada}>
                      <Receipt size={16} /> Faturar OS
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
