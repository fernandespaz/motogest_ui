import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Percent } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { useSolicitacoesDescontoPendentes, useAprovarDesconto, useRejeitarDesconto } from '@/hooks/useDescontos';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { SolicitacaoDescontoResponse } from '@/api/types';

export function DescontosPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useSolicitacoesDescontoPendentes();
  const aprovar = useAprovarDesconto();
  const [rejeitando, setRejeitando] = useState<SolicitacaoDescontoResponse | null>(null);
  const [motivo, setMotivo] = useState('');
  const rejeitar = useRejeitarDesconto();

  async function handleAprovar(id: number) {
    try {
      await aprovar.mutateAsync(id);
      toast.success('Desconto aprovado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível aprovar o desconto.'));
    }
  }

  async function confirmarRejeicao() {
    if (!rejeitando?.id || !motivo.trim()) return;
    try {
      await rejeitar.mutateAsync({ id: rejeitando.id, payload: { motivo: motivo.trim() } });
      toast.success('Desconto rejeitado.');
      setRejeitando(null);
      setMotivo('');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível rejeitar o desconto.'));
    }
  }

  function irParaOrigem(row: SolicitacaoDescontoResponse) {
    const caminho = row.origemTipo === 'ORCAMENTO' ? '/orcamentos' : '/ordens-servico';
    navigate(`${caminho}/${row.origemId}`);
  }

  return (
    <div>
      <PageHeader
        title="Solicitações de Desconto"
        subtitle="Pedidos de desconto em itens de Orçamento/OS aguardando sua aprovação"
      />

      <Card>
        <DataTable<SolicitacaoDescontoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyIcon={Percent}
          emptyTitle="Nenhuma solicitação pendente"
          emptyDescription="Pedidos de desconto feitos por Consultores aparecem aqui até serem aprovados ou rejeitados."
          columns={[
            {
              header: 'Origem',
              render: (row) => (
                <button onClick={() => irParaOrigem(row)} className="font-medium text-brand-600 hover:underline">
                  {row.origemTipo === 'ORCAMENTO' ? 'Orçamento' : 'OS'} #{row.origemId}
                </button>
              ),
            },
            { header: 'Item', render: (row) => row.itemDescricao || '—' },
            {
              header: 'Valor original',
              render: (row) => formatCurrency(row.valorUnitarioOriginal),
              hideBelow: 'sm',
            },
            {
              header: 'Valor solicitado',
              render: (row) => (
                <span className="font-medium text-ink">
                  {formatCurrency(row.valorUnitarioSolicitado)}
                  {row.percentualDesconto != null && (
                    <span className="ml-1 text-xs text-ink-muted">(-{row.percentualDesconto}%)</span>
                  )}
                </span>
              ),
            },
            {
              header: 'Solicitado por',
              render: (row) => (
                <div>
                  <p>{row.solicitadoPorNome || '—'}</p>
                  <p className="text-xs text-ink-muted">{formatDateTime(row.solicitadoEm)}</p>
                </div>
              ),
              hideBelow: 'md',
            },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => handleAprovar(row.id!)}
                    disabled={aprovar.isPending}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-green-50 hover:text-success disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Aprovar"
                    title="Aprovar"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setRejeitando(row)}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                    aria-label="Rejeitar"
                    title="Rejeitar"
                  >
                    <X size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!rejeitando}
        onClose={() => setRejeitando(null)}
        title="Rejeitar solicitação de desconto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejeitando(null)} disabled={rejeitar.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarRejeicao} loading={rejeitar.isPending} disabled={!motivo.trim()}>
              Rejeitar
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo da rejeição"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Explique por que esse desconto não foi aprovado..."
        />
      </Modal>
    </div>
  );
}
