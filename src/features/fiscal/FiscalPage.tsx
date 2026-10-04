import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';
import { PERMISSAO_FISCAL_EMITIR, PERMISSOES_FISCAL } from '@/hooks/useFiscal';
import { useAuthStore } from '@/store/authStore';
import { ConfiguracaoFiscalTab } from './ConfiguracaoFiscalTab';
import { NotasFiscaisTab } from './NotasFiscaisTab';

export function FiscalPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  // Notas e configuração exigem permissões diferentes: cada aba só existe para
  // quem pode usá-la (nenhuma query fiscal dispara sem a permissão).
  const veNotas = hasPermission(PERMISSAO_FISCAL_EMITIR);
  const veConfiguracao = PERMISSOES_FISCAL.some(hasPermission);
  const [tab, setTab] = useState(veNotas ? 'notas' : 'configuracao');

  const abas = [
    ...(veNotas ? [{ key: 'notas', label: 'Notas emitidas' }] : []),
    ...(veConfiguracao ? [{ key: 'configuracao', label: 'Configuração' }] : []),
  ];

  return (
    <div>
      <PageHeader title="Fiscal" subtitle="Emissão de NFS-e e configuração fiscal da oficina" />
      <Tabs tabs={abas} active={tab} onChange={setTab} />
      <TabPanel hidden={tab !== 'notas' || !veNotas}>
        <NotasFiscaisTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'configuracao' || !veConfiguracao}>
        <ConfiguracaoFiscalTab />
      </TabPanel>
    </div>
  );
}

export function FiscalSemAcesso() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Sem permissão"
      description="Você não tem acesso ao módulo fiscal. Fale com o administrador da oficina."
    />
  );
}
