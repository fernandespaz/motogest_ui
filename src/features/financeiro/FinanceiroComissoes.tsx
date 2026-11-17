import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Coins, Info, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { useComissoes } from '@/hooks/useComissoes';
import { useFeriadosDosMeses } from '@/hooks/useDiasUteis';
import { useSituacaoFechamento } from '@/hooks/useFinanceiro';
import { agruparPorFuncionario, totaisDoPeriodo } from '@/lib/comissoesAgrupadas';
import { ultimosPeriodos } from '@/lib/comissaoPeriodo';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { ComissoesFuncionario } from './ComissoesFuncionario';

const PERSONALIZADO = 'personalizado';

/**
 * Comissões por período: o financeiro escolhe o período (fechamento mensal ou um intervalo livre), vê quanto cada
 * funcionário tem a receber e abre a pessoa para conferir as OS que geraram o valor e pagar. A comissão nasce
 * sozinha (OS concluída → mecânico; OS faturada → consultor); "a pagar" é a comissão já gerada e ainda não paga.
 */
export function FinanceiroComissoes() {
  const podePagar = useAuthStore((s) => s.hasPermission('FINANCEIRO_WRITE'));
  const podeAbrirOs = useAuthStore((s) => s.hasPermission('ORDEM_SERVICO_READ'));
  const situacao = useSituacaoFechamento({ silentError: true });
  const diaFechamento = situacao.data?.diaFechamento;
  // O 5º dia útil depende dos feriados do mês do pagamento: primeiro descobre quais meses (sem feriados),
  // busca os feriados deles e só então calcula as datas finais.
  const mesesDePagamento = useMemo(
    () => (diaFechamento ? ultimosPeriodos(new Date(), diaFechamento).map((p) => p.pagamentoPrevisto.slice(0, 7)) : []),
    [diaFechamento],
  );
  const { feriados, semUf } = useFeriadosDosMeses(mesesDePagamento);
  const periodos = useMemo(
    () => (diaFechamento ? ultimosPeriodos(new Date(), diaFechamento, 12, feriados) : []),
    [diaFechamento, feriados],
  );

  const [fimEscolhido, setFimEscolhido] = useState<string>();
  const personalizado = fimEscolhido === PERSONALIZADO;
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const periodoFechamento = periodos.find((p) => p.fim === fimEscolhido) ?? periodos[0];
  // No intervalo livre só há consulta com as duas datas válidas; sem previsão de pagamento (não é um fechamento).
  const intervaloValido = !!de && !!ate && de <= ate;
  const periodo = personalizado
    ? intervaloValido
      ? { inicio: de, fim: ate, pagamentoPrevisto: undefined }
      : undefined
    : periodoFechamento;

  const lista = useComissoes({ inicio: periodo?.inicio, fim: periodo?.fim }, { enabled: !!periodo });
  const grupos = useMemo(() => agruparPorFuncionario(lista.data ?? []), [lista.data]);
  const totais = totaisDoPeriodo(grupos);

  if (situacao.isLoading) return <PageSpinner label="Carregando comissões..." />;
  if (!periodoFechamento && !personalizado) {
    return <p className="text-sm text-ink-muted">Não foi possível carregar o dia de fechamento do financeiro.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Comissões por período"
          subtitle={
            periodo
              ? `${formatDate(periodo.inicio)} a ${formatDate(periodo.fim)}${personalizado ? '' : ` · fechamento no dia ${diaFechamento}`}`
              : 'Informe o intervalo de datas'
          }
          action={
            periodo?.pagamentoPrevisto && (
              <Badge tone="brand">
                <CalendarClock size={12} className="mr-1 inline" aria-hidden="true" />
                Pagamento previsto: {formatDate(periodo.pagamentoPrevisto)}
              </Badge>
            )
          }
        />
        <CardBody className="flex flex-col gap-4">
          <Select
            label="Período"
            value={personalizado ? PERSONALIZADO : periodoFechamento.fim}
            onChange={(e) => setFimEscolhido(e.target.value)}
            hint="Cada período vai do dia seguinte ao fechamento anterior até o dia de fechamento. O pagamento é previsto para o 5º dia útil do mês seguinte (segunda a sexta, sem feriados nacionais e estaduais; feriado municipal não entra na conta)."
          >
            {periodos.map((p) => (
              <option key={p.fim} value={p.fim}>
                {formatDate(p.inicio)} a {formatDate(p.fim)} — paga em {formatDate(p.pagamentoPrevisto)}
              </option>
            ))}
            <option value={PERSONALIZADO}>Intervalo personalizado</option>
          </Select>

          {semUf && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warning dark:bg-amber-900/20">
              <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                A UF da oficina não está preenchida, então só os feriados nacionais entram no cálculo.{' '}
                <Link to="/oficina" className="font-medium underline">
                  Informe a UF da oficina
                </Link>{' '}
                para considerar também os feriados estaduais.
              </span>
            </p>
          )}

          {personalizado && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="De" type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} />
              <Input label="Até" type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} />
            </div>
          )}
        </CardBody>
      </Card>

      {!periodo ? (
        <EmptyState title="Escolha o intervalo" description="Preencha as duas datas, com a data final igual ou depois da inicial." />
      ) : lista.isLoading ? (
        <PageSpinner label="Carregando comissões..." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={Wallet} label="A pagar" value={formatCurrency(totais.aPagar)} tone="warning" index={0} />
            <StatCard icon={CheckCircle2} label="Já pago" value={formatCurrency(totais.pago)} tone="success" index={1} />
            <StatCard icon={Coins} label="Total do período" value={formatCurrency(totais.total)} index={2} />
          </div>

          {grupos.length === 0 ? (
            <EmptyState
              title="Nenhuma comissão neste período"
              description="A comissão do mecânico é gerada quando a OS é concluída e a do consultor quando a OS é faturada."
            />
          ) : (
            <section aria-label="Funcionários" className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                <strong className="text-ink">A pagar</strong> é a comissão já gerada que ainda não foi paga. Abra um funcionário para ver as OS que
                geraram o valor e pagar.
              </p>
              {grupos.map((g) => (
                <ComissoesFuncionario
                  key={`${periodo.inicio}-${periodo.fim}-${g.usuarioId}`}
                  grupo={g}
                  podePagar={podePagar}
                  podeAbrirOs={podeAbrirOs}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
