import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useAuthStore } from '@/store/authStore';
import { CaixaAdminTab } from './CaixaAdminTab';
import { ContasPagarTab } from './ContasPagarTab';
import { ContasReceberTab } from './ContasReceberTab';

type Aba = 'caixa' | 'pagar' | 'receber';

export function FinanceiroPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeFinanceiro = hasPermission('FINANCEIRO_READ');
  // Caixa é gerido por um código próprio (CAIXA_GERENCIAR), não por
  // FINANCEIRO_READ — o Perfil Caixa (CAIXA_OPERAR, sem FINANCEIRO_READ) usa
  // "Meu Caixa" (/caixa) e nunca deveria enxergar Contas a Pagar/Receber; o
  // inverso também vale, quem só vê o financeiro geral não precisa ver todos
  // os caixas/turnos de outros operadores.
  const podeCaixaGerenciar = hasPermission('CAIXA_GERENCIAR');

  const [params, setParams] = useSearchParams();
  const pedida = params.get('aba') as Aba | null;
  const abas: { key: Aba; label: string; visivel: boolean }[] = [
    { key: 'caixa', label: 'Caixa', visivel: podeCaixaGerenciar },
    { key: 'pagar', label: 'Contas a Pagar', visivel: podeFinanceiro },
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
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa e contas da oficina" />

      <Tabs tabs={abas} active={tab ?? ''} onChange={trocarAba} />

      <TabPanel hidden={tab !== 'caixa'}>
        <CaixaAdminTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'pagar'}>
        <ContasPagarTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'receber'}>
        <ContasReceberTab />
      </TabPanel>
    </div>
  );
}
