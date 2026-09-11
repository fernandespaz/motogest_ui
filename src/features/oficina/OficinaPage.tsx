import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { OficinaDadosTab } from './OficinaDadosTab';
import { LicencaTab } from './LicencaTab';

export function OficinaPage() {
  const location = useLocation();
  const [tab, setTab] = useState(location.pathname.endsWith('/licenca') ? 'licenca' : 'dados');

  return (
    <div>
      <PageHeader title="Minha Oficina" subtitle="Dados cadastrais e licença da sua conta" />

      <Tabs
        tabs={[
          { key: 'dados', label: 'Dados cadastrais' },
          { key: 'licenca', label: 'Licença e plano' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <TabPanel hidden={tab !== 'dados'}>
        <OficinaDadosTab />
      </TabPanel>
      <TabPanel hidden={tab !== 'licenca'}>
        <LicencaTab />
      </TabPanel>
    </div>
  );
}
