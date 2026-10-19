import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { CheckCircle } from '@phosphor-icons/react';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import {
  useContasPagarPendentes,
  useContasReceberPendentes,
  usePagarConta,
  useReceberConta,
  useSituacaoFechamento,
} from '@/hooks/useFinanceiro';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { BaixaContaRequest } from '@/api/types';
import { BaixaContaModal } from '@/features/financeiro/BaixaContaModal';
import type { TipoConta } from '@/features/financeiro/ContaFormModal';

interface LinhaConta {
  chave: string;
  id: number;
  tipo: TipoConta;
  descricao: string;
  contraparte?: string;
  valor: number;
  vencimento: string;
}

const DIAS_ATRASO = 90;
const DIAS_ADIANTE = 7;

function situacaoDoVencimento(vencimento: string, hoje: Date) {
  const dias = differenceInCalendarDays(parseISO(vencimento), hoje);
  if (dias < 0) return { tone: 'danger' as const, label: dias === -1 ? 'Venceu ontem' : `Atrasada ${-dias} dias` };
  if (dias === 0) return { tone: 'warning' as const, label: 'Vence hoje' };
  return { tone: 'neutral' as const, label: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}` };
}

/**
 * Contas a pagar e a receber que pedem baixa agora (atrasadas, de hoje e da próxima semana), pra o caixa
 * do administrador quitá-las sem sair da tela. A baixa usa o mesmo endpoint do Financeiro, que já gera o
 * lançamento no caixa aberto — então o que é baixado aqui aparece nos dois lugares, vinculado à conta.
 * Só é montado por quem tem FINANCEIRO_READ: o perfil de operador de caixa não vê dados administrativos.
 */
export function ContasDoDiaCard() {
  const hoje = useMemo(() => new Date(), []);
  const inicio = format(addDays(hoje, -DIAS_ATRASO), 'yyyy-MM-dd');
  const fim = format(addDays(hoje, DIAS_ADIANTE), 'yyyy-MM-dd');
  const pagar = useContasPagarPendentes(inicio, fim);
  const receber = useContasReceberPendentes(inicio, fim);
  const dataMuro = useSituacaoFechamento({ silentError: true }).data?.dataMuro;
  const pagarConta = usePagarConta();
  const receberConta = useReceberConta();
  const [baixando, setBaixando] = useState<LinhaConta | null>(null);

  const linhas = useMemo<LinhaConta[]>(() => {
    const aPagar = (pagar.data ?? []).map((c) => ({
      chave: `pagar-${c.id}`,
      id: c.id!,
      tipo: 'pagar' as const,
      descricao: c.descricao ?? '—',
      contraparte: c.fornecedor,
      valor: c.valor ?? 0,
      vencimento: c.dataVencimento ?? '',
    }));
    const aReceber = (receber.data ?? []).map((c) => ({
      chave: `receber-${c.id}`,
      id: c.id!,
      tipo: 'receber' as const,
      descricao: c.descricao ?? '—',
      contraparte: c.clienteNome,
      valor: c.valor ?? 0,
      vencimento: c.dataVencimento ?? '',
    }));
    return [...aPagar, ...aReceber].filter((l) => l.vencimento).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [pagar.data, receber.data]);

  async function confirmar(baixa: BaixaContaRequest) {
    if (!baixando) return;
    const quitando = baixando.tipo === 'pagar';
    try {
      const mutacao = quitando ? pagarConta : receberConta;
      await mutacao.mutateAsync({ id: baixando.id, baixa });
      toast.success(quitando ? 'Conta paga e lançada no caixa.' : 'Conta recebida e lançada no caixa.');
      setBaixando(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível dar baixa na conta.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title="Contas para baixar"
        subtitle="Atrasadas, de hoje e dos próximos 7 dias — a baixa é lançada neste caixa e no Financeiro."
      />
      <DataTable<LinhaConta>
        loading={pagar.isLoading || receber.isLoading}
        rows={linhas}
        rowKey={(l) => l.chave}
        emptyTitle="Nenhuma conta pendente para este período"
        columns={[
          {
            header: 'Tipo',
            render: (l) => <Badge tone={l.tipo === 'pagar' ? 'danger' : 'success'}>{l.tipo === 'pagar' ? 'A pagar' : 'A receber'}</Badge>,
          },
          {
            header: 'Conta',
            render: (l) => (
              <div>
                <p className="font-medium text-ink">{l.descricao}</p>
                {l.contraparte && <p className="text-xs text-ink-muted">{l.contraparte}</p>}
              </div>
            ),
          },
          {
            header: 'Vencimento',
            render: (l) => {
              const s = situacaoDoVencimento(l.vencimento, hoje);
              return (
                <div className="flex flex-col items-start gap-1">
                  <span>{formatDate(l.vencimento)}</span>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
              );
            },
            hideBelow: 'sm',
          },
          { header: 'Valor', render: (l) => formatCurrency(l.valor) },
          {
            header: '',
            render: (l) => (
              <IconActionButton
                icon={CheckCircle}
                tone={l.tipo === 'pagar' ? 'danger' : 'success'}
                label={`${l.tipo === 'pagar' ? 'Pagar' : 'Receber'} ${l.descricao}`}
                onClick={() => setBaixando(l)}
              />
            ),
          },
        ]}
      />
      <BaixaContaModal
        tipo={baixando?.tipo ?? 'pagar'}
        conta={baixando ? { descricao: baixando.descricao, valor: baixando.valor } : null}
        fechadoAte={dataMuro}
        loading={pagarConta.isPending || receberConta.isPending}
        onConfirm={confirmar}
        onClose={() => setBaixando(null)}
      />
    </Card>
  );
}
