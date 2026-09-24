import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileDown, Send, Check, X, Wrench, Trash2, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useTodosOrcamentos,
  useDeleteOrcamento,
  useEnviarOrcamento,
  useAprovarOrcamento,
  useRejeitarOrcamento,
} from '@/hooks/useOrcamentos';
import { useCriarOSAPartirDeOrcamento } from '@/hooks/useOrdensServico';
import type { OrcamentoResponse } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { orcamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { buildOrcamentoPdfBlob } from './orcamentoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { ModeloVeiculoThumb, useImagensPorVeiculoId } from '@/features/shared/ModeloVeiculoField';
import { useAuthStore } from '@/store/authStore';
import { isConsultor } from '@/lib/perfil';

const TAMANHO_PAGINA = 20;

export function OrcamentosPage() {
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<OrcamentoResponse | null>(null);
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.perfil);
  const usuarioId = useAuthStore((s) => s.usuarioId);

  // GET /orcamentos não tem filtro de status nem de consultor no backend
  // (confirmado no openapi.json — o único parâmetro é paginação), então os
  // dois cortes abaixo são feitos no cliente. Filtrar uma página que o
  // SERVIDOR já paginou quebra a contagem por página (uma sobra 2 itens
  // depois do filtro, a seguinte 5...) — por isso useTodosOrcamentos busca o
  // conjunto inteiro uma vez e a paginação abaixo é inteiramente local, sobre
  // os dados já filtrados.
  //
  // IMPORTANTE: o filtro por consultor é só um recorte de UX pra evitar que
  // um consultor veja (e tente puxar) a carteira de outro no dia a dia
  // normal do app — não é controle de acesso de verdade. Alguém que chame
  // GET /orcamentos direto (fora da UI) continua recebendo a lista inteira,
  // porque ORCAMENTO_READ é uma permissão só, sem distinção entre "ver os
  // próprios" e "ver todos". Pra uma garantia real, o backend precisaria
  // escopar a listagem por consultor (mesmo caso do PRODUTIVIDADE_READ que já
  // foi ajustado com um endpoint "/me" — aqui precisaria de algo equivalente).
  const { data: todos, isLoading } = useTodosOrcamentos('id,desc');
  const imagensPorVeiculoId = useImagensPorVeiculoId();
  const filtrados = useMemo(
    () =>
      (todos ?? []).filter(
        (o: OrcamentoResponse) =>
          o.status !== 'CONVERTIDO' && (!isConsultor(perfil) || usuarioId == null || o.consultorId === usuarioId),
      ),
    [todos, perfil, usuarioId],
  );
  const totalElements = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / TAMANHO_PAGINA));
  // Depois de remover um orçamento (ou o filtro de carteira encolher a
  // lista), a página guardada em estado pode ficar maior que o total — sem
  // isso, a tabela mostraria "nenhum encontrado" em vez de voltar pra uma
  // página que existe.
  const paginaAtual = Math.min(page, totalPages - 1);
  const rows = filtrados.slice(paginaAtual * TAMANHO_PAGINA, (paginaAtual + 1) * TAMANHO_PAGINA);
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
      await openPdfInNewTab(() => buildOrcamentoPdfBlob(row), `orcamento-${row.id}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  function compartilharWhatsApp(row: OrcamentoResponse) {
    if (!row.tokenAprovacao) {
      toast.error('Envie o orçamento ao cliente antes de compartilhar o link.');
      return;
    }
    const link = `${window.location.origin}/orcamentos/publico/${row.tokenAprovacao}`;
    const texto = `Olá! Segue o orçamento nº ${row.id} da ${row.clienteNome ? `oficina para ${row.clienteNome}` : 'oficina'}, no valor de ${formatCurrency(row.valorTotal)}. Você pode conferir e aprovar por aqui: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  async function handleConverter(row: OrcamentoResponse) {
    try {
      const os = await criarOS.mutateAsync({ orcamentoId: row.id! });
      // useCriarOSAPartirDeOrcamento tenta promover a OS pra Aprovada sozinho,
      // mas engole qualquer falha nesse passo pra não travar a conversão em
      // si (ver comentário lá) — avisa aqui se não chegou em Aprovada, senão
      // a OS fica presa esperando ação manual sem o consultor saber.
      if (os.status === 'APROVADA') {
        toast.success('Ordem de Serviço criada a partir do orçamento.');
      } else {
        toast.error('OS criada, mas não foi possível aprová-la automaticamente. Envie/aprove manualmente.');
      }
      navigate(`/ordens-servico/${os.id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível converter em OS.'));
    }
  }

  // Enviar e compartilhar eram duas ações separadas — dava pra compartilhar o
  // link (o token já existe desde a criação) antes de marcar como enviado, e
  // aí o cliente abria um orçamento que a tela pública ainda tratava como
  // rascunho, sem opção de aprovar. Uma única ação resolve os dois passos
  // juntos, na ordem certa.
  async function handleEnviarECompartilhar(row: OrcamentoResponse) {
    try {
      const atualizado = await enviar.mutateAsync(row.id!);
      toast.success('Orçamento enviado — aguardando aprovação do cliente.');
      compartilharWhatsApp(atualizado);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível enviar o orçamento.'));
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
          rows={rows}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum orçamento cadastrado"
          columns={[
            {
              header: '#',
              render: (row) => (
                <span className="flex items-center gap-2 font-medium text-ink">
                  <ModeloVeiculoThumb base64={row.veiculoId != null ? imagensPorVeiculoId.get(row.veiculoId) : undefined} size={28} />
                  {row.id}
                </span>
              ),
            },
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
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      baixarPdf(row);
                    }}
                  >
                    <FileDown size={14} /> PDF
                  </Button>
                  {row.status === 'RASCUNHO' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnviarECompartilhar(row);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-green-50 hover:text-success dark:hover:bg-green-900/30"
                        title="Enviar para aprovação (WhatsApp)"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(row);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/30"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {row.status === 'ENVIADO' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          compartilharWhatsApp(row);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                        title="Reenviar link via WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </button>
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
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-green-50 hover:text-success dark:hover:bg-green-900/30"
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
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/30"
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
                      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-brand-700"
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
        {todos && <Pagination page={paginaAtual} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />}
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
