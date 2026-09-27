import { History } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import type { AcaoAuditoria, AuditoriaParametroFinanceiroResponse, PageResponse } from '@/api/types';
import { formatDateTime } from '@/lib/formatters';

const ACOES: Record<AcaoAuditoria, { label: string; tone: 'success' | 'brand' | 'danger' }> = {
  CRIACAO: { label: 'Criação', tone: 'success' },
  ATUALIZACAO: { label: 'Alteração', tone: 'brand' },
  EXCLUSAO: { label: 'Exclusão', tone: 'danger' },
};

/**
 * Histórico de auditoria de parâmetros financeiros — mesmo formato de
 * resposta (AuditoriaParametroFinanceiroResponse) usado tanto por Hora
 * Técnica quanto por Capacidade Produtiva, cada uma com seu próprio endpoint
 * e permissão; o componente só recebe os dados já buscados pela tela dona.
 */
export function AuditoriaFinanceiraCard({
  data,
  isLoading,
  page,
  onPageChange,
}: {
  data: PageResponse<AuditoriaParametroFinanceiroResponse> | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
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
        <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={onPageChange} />
      )}
    </Card>
  );
}
