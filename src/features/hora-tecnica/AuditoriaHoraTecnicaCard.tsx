import { useState } from 'react';
import { History } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useAuditoriaHoraTecnica } from '@/hooks/useHoraTecnica';
import type { AcaoAuditoria, AuditoriaParametroFinanceiroResponse } from '@/api/types';
import { formatDateTime } from '@/lib/formatters';

const ACOES: Record<AcaoAuditoria, { label: string; tone: 'success' | 'brand' | 'danger' }> = {
  CRIACAO: { label: 'Criação', tone: 'success' },
  ATUALIZACAO: { label: 'Alteração', tone: 'brand' },
  EXCLUSAO: { label: 'Exclusão', tone: 'danger' },
};

export function AuditoriaHoraTecnicaCard() {
  const [page, setPage] = useState(0);
  // Backend já devolve do mais recente pro mais antigo.
  const { data, isLoading } = useAuditoriaHoraTecnica({ page, size: 10 });

  return (
    <Card>
      <CardHeader title="Histórico de alterações" subtitle="Quem mudou o quê nos parâmetros financeiros" />
      <DataTable<AuditoriaParametroFinanceiroResponse>
        loading={isLoading}
        rows={data?.content ?? []}
        rowKey={(a) => a.id!}
        emptyIcon={History}
        emptyTitle="Nenhuma alteração registrada ainda"
        columns={[
          { header: 'Data', render: (a) => <span className="whitespace-nowrap">{formatDateTime(a.dataHora)}</span> },
          { header: 'Usuário', render: (a) => a.usuarioNome ?? '—', hideBelow: 'sm' },
          {
            header: 'Ação',
            render: (a) => {
              const acao = a.acao ? ACOES[a.acao] : undefined;
              return acao ? <Badge tone={acao.tone}>{acao.label}</Badge> : '—';
            },
          },
          { header: 'Detalhes', render: (a) => <span className="text-ink-muted">{a.detalhes}</span> },
        ]}
      />
      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
      )}
    </Card>
  );
}
