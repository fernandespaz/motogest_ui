import { useState } from 'react';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { CaixaSessoesTab } from './CaixaSessoesTab';
import { CaixaRelatoriosTab } from './CaixaRelatoriosTab';
import { CaixaAuditoriaTab } from './CaixaAuditoriaTab';

type SubAba = 'sessoes' | 'auditoria' | 'relatorios';

/** Visão "Todos os Caixas" do perfil Administrativo — gate em CAIXA_GERENCIAR, separado de FINANCEIRO_READ (ver FinanceiroPage). */
export function CaixaAdminTab() {
  const [subAba, setSubAba] = useState<SubAba>('sessoes');

  return (
    <div>
      <Tabs
        tabs={[
          { key: 'sessoes', label: 'Todos os Caixas' },
          { key: 'auditoria', label: 'Auditoria' },
          { key: 'relatorios', label: 'Relatórios' },
        ]}
        active={subAba}
        onChange={(k) => setSubAba(k as SubAba)}
      />
      <TabPanel hidden={subAba !== 'sessoes'}>
        <CaixaSessoesTab />
      </TabPanel>
      <TabPanel hidden={subAba !== 'auditoria'}>
        {subAba === 'auditoria' && <CaixaAuditoriaTab />}
      </TabPanel>
      <TabPanel hidden={subAba !== 'relatorios'}>
        <CaixaRelatoriosTab />
      </TabPanel>
    </div>
  );
}
