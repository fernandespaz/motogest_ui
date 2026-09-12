import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileDown, Send, Check, X, Wrench, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useOrcamentos,
  useDeleteOrcamento,
  useEnviarOrcamento,
  useAprovarOrcamento,
  useRejeitarOrcamento,
} from '@/hooks/useOrcamentos';
import { useCriarOSAPartirDeOrcamento } from '@/hooks/useOrdensServico';
import type { OrcamentoResponse } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { orcamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function OrcamentosPage() {
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<OrcamentoResponse | null>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useOrcamentos({ page, size: 20 });
  const deleteMutation = useDeleteOrcamento();
  const enviar = useEnviarOrcamento();
  const aprovar = useAprovarOrcamento();
  const rejeitar = useRejeitarOrcamento();
  const criarOS = useCriarOSAPartirDeOrcamento();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Orçamento removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o orçamento.'));
    }
  }

  async function baixarPdf(row: OrcamentoResponse) {
    try {
      await openPdfInNewTab(() => orcamentosApi.pdf(row.id!), `orcamento-${row.id}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  async function handleConverter(row: OrcamentoResponse) {
    try {
      const os = await criarOS.mutateAsync({ orcamentoId: row.id! });
      toast.success('Ordem de Serviço criada a partir do orçamento.');
      navigate(`/ordens-servico/${os.id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível converter em OS.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas de serviços e produtos para clientes"
        action={
          <Button onClick={() => navigate('/orcamentos/novo')}>
            <Plus size={18} /> Novo orçamento
          </Button>
        }
      />

      <Card>
        <DataTable<OrcamentoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum orçamento cadastrado"
          columns={[
            { header: '#', render: (row) => row.id, className: 'font-medium text-ink' },
            { header: 'Cliente', render: (row) => `${row.clienteNome ?? ''} — ${row.veiculoPlaca ?? ''}` },
            { header: 'Valor', render: (row) => formatCurrency(row.valorTotal) },
            { header: 'Criado em', render: (row) => formatDate(row.createdAt), hideBelow: 'sm' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(orcamentoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      baixarPdf(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                    title="Baixar PDF"
                  >
                    <FileDown size={16} />
                  </button>
                  {row.status === 'RASCUNHO' && (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await enviar.mutateAsync(row.id!);
                            toast.success('Orçamento enviado ao cliente.');
                          } catch (error) {
                            toast.error(extractErrorMessage(error));
                          }
                        }}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                        title="Enviar ao cliente"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(row);
                        }}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {row.status === 'ENVIADO' && (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await aprovar.mutateAsync(row.id!);
                            toast.success('Orçamento aprovado.');
                          } catch (error) {
                            toast.error(extractErrorMessage(error));
                          }
                        }}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-green-50 hover:text-success"
                        title="Aprovar"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await rejeitar.mutateAsync(row.id!);
                            toast.info('Orçamento rejeitado.');
                          } catch (error) {
                            toast.error(extractErrorMessage(error));
                          }
                        }}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                        title="Rejeitar"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {row.status === 'APROVADO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConverter(row);
                      }}
                      className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                      title="Converter em Ordem de Serviço"
                    >
                      <Wrench size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          onRowClick={(row) => navigate(`/orcamentos/${row.id}`)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        title="Remover orçamento"
        description={`Tem certeza que deseja remover o orçamento #${deleting?.id}?`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
