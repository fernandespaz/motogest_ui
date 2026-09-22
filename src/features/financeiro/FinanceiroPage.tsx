import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useAuthStore } from '@/store/authStore';
import { PERMISSAO_GERENCIAR_HORA_TECNICA } from '@/hooks/useHoraTecnica';
import { CaixaTab } from './CaixaTab';
import { ContasPagarTab } from './ContasPagarTab';
import { ContasReceberTab } from './ContasReceberTab';
import { DespesasFixasTab } from './DespesasFixasTab';

type Aba = 'caixa' | 'pagar' | 'despesas-fixas' | 'receber';

export function FinanceiroPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  // GET/POST /financeiro/hora-tecnica/custos-fixos exigem HORA_TECNICA_GERENCIAR,
  // não FINANCEIRO_READ — sem ela a aba nem aparece (e a lista não dispara 403).
  const podeDespesasFixas = hasPermission(PERMISSAO_GERENCIAR_HORA_TECNICA);
  // O inverso também vale: quem só gerencia a hora técnica chega aqui pelo
  // atalho da tela dela e vê só a aba de despesas fixas.
  const podeFinanceiro = hasPermission('FINANCEIRO_READ');

  // Aba na URL (?aba=) — a tela de Hora Técnica aponta direto pra cá.
  const [params, setParams] = useSearchParams();
  const pedida = params.get('aba') as Aba | null;
  const abas: { key: Aba; label: string; visivel: boolean }[] = [
    { key: 'caixa', label: 'Caixa', visivel: podeFinanceiro },
    { key: 'pagar', label: 'Contas a Pagar', visivel: podeFinanceiro },
    { key: 'despesas-fixas', label: 'Despesas Fixas', visivel: podeDespesasFixas },
    { key: 'receber', label: 'Contas a Receber', visivel: podeFinanceiro },
  ].filter((a) => a.visivel) as { key: Aba; label: string; visivel: boolean }[];
  const tab: Aba | undefined = abas.some((a) => a.key === pedida) ? pedida! : abas[0]?.key;

  function trocarAba(nova: string) {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.set('aba', nova);
        return proximo;
      },
      { replace: true },
    );
  }

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa, contas e despesas fixas da oficina" />

      <Tabs tabs={abas} active={tab ?? ''} onChange={trocarAba} />

      <TabPanel hidden={tab !== 'caixa'}>
        <CaixaTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'pagar'}>
        <ContasPagarTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'despesas-fixas'}>
        <DespesasFixasTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'receber'}>
        <ContasReceberTab />
      </TabPanel>
    </div>
  );
}
