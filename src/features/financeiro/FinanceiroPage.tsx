import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useAuthStore } from '@/store/authStore';
import { useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { CaixaAdminTab } from './CaixaAdminTab';
import { ContasTab } from './ContasTab';
import { FinanceiroAjustes } from './FinanceiroAjustes';
import { FinanceiroVisaoGeral, type DestinoFinanceiro } from './FinanceiroVisaoGeral';
import { SITUACOES, resumirPorSituacao, type SituacaoConta } from './contasUtils';

type Aba = 'geral' | 'pagar' | 'receber' | 'caixa' | 'ajustes';

function situacaoDaUrl(valor: string | null): SituacaoConta | 'todas' {
  return SITUACOES.includes(valor as SituacaoConta) ? (valor as SituacaoConta) : 'todas';
}

export function FinanceiroPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeFinanceiro = hasPermission('FINANCEIRO_READ');
  // Caixa é gerido por um código próprio (CAIXA_GERENCIAR), não por
  // FINANCEIRO_READ — o Perfil Caixa (CAIXA_OPERAR, sem FINANCEIRO_READ) usa
  // "Meu Caixa" (/caixa) e nunca deveria enxergar Contas a Pagar/Receber; o
  // inverso também vale, quem só vê o financeiro geral não precisa ver todos
  // os caixas/turnos de outros operadores.
  const podeCaixaGerenciar = hasPermission('CAIXA_GERENCIAR');

  // Os números das abas e da faixa de vencidas vêm da mesma consulta que as
  // telas de contas usam (fica em cache), então não custa uma busca a mais.
  const pagar = useTodasContasPagar({ enabled: podeFinanceiro });
  const receber = useTodasContasReceber({ enabled: podeFinanceiro });
  const vencidasPagar = useMemo(() => resumirPorSituacao(pagar.data ?? []).vencida.quantidade, [pagar.data]);
  const vencidasReceber = useMemo(() => resumirPorSituacao(receber.data ?? []).vencida.quantidade, [receber.data]);
  const totalVencidas = vencidasPagar + vencidasReceber;

  const [params, setParams] = useSearchParams();
  const pedida = params.get('aba') as Aba | null;
  const abas: { key: Aba; label: string; visivel: boolean; badge?: { texto: string; tone?: 'danger' | 'neutral' } }[] = [
    { key: 'geral', label: 'Visão geral', visivel: podeFinanceiro },
    {
      key: 'pagar',
      label: 'A pagar',
      visivel: podeFinanceiro,
      badge: vencidasPagar > 0 ? { texto: String(vencidasPagar), tone: 'danger' } : undefined,
    },
    {
      key: 'receber',
      label: 'A receber',
      visivel: podeFinanceiro,
      badge: vencidasReceber > 0 ? { texto: String(vencidasReceber), tone: 'danger' } : undefined,
    },
    { key: 'caixa', label: 'Caixa', visivel: podeCaixaGerenciar },
    { key: 'ajustes', label: 'Ajustes', visivel: podeFinanceiro },
  ];
  const visiveis = abas.filter((a) => a.visivel);
  const tab: Aba | undefined = visiveis.some((a) => a.key === pedida) ? pedida! : visiveis[0]?.key;
  const situacaoInicial = situacaoDaUrl(params.get('situacao'));

  function irPara(aba: Aba, situacao?: SituacaoConta) {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.set('aba', aba);
        if (situacao) proximo.set('situacao', situacao);
        else proximo.delete('situacao');
        return proximo;
      },
      { replace: true },
    );
  }

  const irParaDestino = (destino: DestinoFinanceiro) => irPara(destino.aba, destino.situacao);
  const irParaVencidas = () => irPara(vencidasPagar > 0 ? 'pagar' : 'receber', 'vencida');

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Contas a pagar e a receber, e o caixa da oficina" />

      {podeFinanceiro && totalVencidas > 0 && (
        <button
          type="button"
          onClick={irParaVencidas}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-danger/15"
        >
          <AlertTriangle size={18} className="shrink-0 text-danger" aria-hidden="true" />
          <span className="flex-1">
            <strong className="font-semibold">
              {totalVencidas === 1 ? '1 conta vencida' : `${totalVencidas} contas vencidas`}
            </strong>{' '}
            — {vencidasPagar} a pagar e {vencidasReceber} a receber precisam de atenção.
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-danger">
            Ver vencidas <ChevronRight size={16} aria-hidden="true" />
          </span>
        </button>
      )}

      <Tabs
        tabs={visiveis.map(({ key, label, badge }) => ({ key, label, badge }))}
        active={tab ?? ''}
        onChange={(nova) => irPara(nova as Aba)}
      />

      <TabPanel hidden={tab !== 'geral'}>
        <FinanceiroVisaoGeral onIrPara={irParaDestino} />
      </TabPanel>
      <TabPanel hidden={tab !== 'pagar'}>
        <ContasTab key={`pagar-${situacaoInicial}`} tipo="pagar" situacaoInicial={situacaoInicial} />
      </TabPanel>
      <TabPanel hidden={tab !== 'receber'}>
        <ContasTab key={`receber-${situacaoInicial}`} tipo="receber" situacaoInicial={situacaoInicial} />
      </TabPanel>
      <TabPanel hidden={tab !== 'caixa'}>
        <CaixaAdminTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'ajustes'}>
        <FinanceiroAjustes />
      </TabPanel>
    </div>
  );
}
