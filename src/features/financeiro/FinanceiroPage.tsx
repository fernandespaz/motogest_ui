import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { CaixaTab } from './CaixaTab';
import { ContasPagarTab } from './ContasPagarTab';
import { ContasReceberTab } from './ContasReceberTab';

export function FinanceiroPage() {
  const [tab, setTab] = useState('caixa');

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa e contas da oficina" />

      <Tabs
        tabs={[
          { key: 'caixa', label: 'Caixa' },
          { key: 'pagar', label: 'Contas a Pagar' },
          { key: 'receber', label: 'Contas a Receber' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <TabPanel hidden={tab !== 'caixa'}>
        <CaixaTab />
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
