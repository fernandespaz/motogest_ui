import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuthStore } from '@/store/authStore';
import { isMecanico } from '@/lib/perfil';
import type { OrdemServicoResponse, OrdemServicoStatus } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { buildOrdemServicoPdfBlob } from './ordemServicoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

// Os 5 status mais consultados no dia a dia viram chip (1 clique); os 4
// restantes (menos frequentes) ficam atrás do seletor "Mais status" pra não
// estourar a largura da barra de filtros.
const statusEmDestaque: OrdemServicoStatus[] = ['ABERTA', 'APROVADA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'PAUSADA'];
const statusOutros: OrdemServicoStatus[] = [
  'AGUARDANDO_APROVACAO',
  'CONCLUIDA',
  'CANCELADA',
  'ENTREGUE',
];

const selectCompacto =
  'h-8 shrink-0 rounded-lg border border-border bg-surface-alt px-2.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-400';

export function OrdensServicoPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [status, setStatus] = useState<OrdemServicoStatus | ''>('');
  const [numero, setNumero] = useState('');
  const [tecnicoId, setTecnicoId] = useState<number | ''>('');
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.perfil);
  // Mecânico também acessa essa lista geral (pra achar a OS de um colega,
  // não só as próprias) — mas o formulário completo de /ordens-servico/:id
  // deixa cliente/veículo/itens/valores editáveis pra quem tem
  // ORDEM_SERVICO_WRITE, sem distinguir "editar a OS" de "operar a OS", que é
  // o mesmo código de permissão do Mecânico. Não dá pra travar isso com
  // hasPermission (ver lib/perfil.ts), então a linha leva pra tela própria do
  // técnico (só leitura + checklist/fotos) em vez do formulário do Consultor.
  const linkDetalheOS = isMecanico(perfil) ? '/minhas-os' : '/ordens-servico';

  // Reaproveita o mesmo seletor de "Técnico Resp." do formulário de OS — a
  // API já aceita usuarioResponsavelId no filtro da listagem, só não estava
  // exposto aqui. useUsuarios() já se desliga sozinho (enabled) pra quem não
  // tem USUARIO_READ, então o filtro simplesmente some pra esses perfis.
  const { data: usuarios } = useUsuarios();
  const mecanicos = usuarios?.filter((u) => isMecanico(u.perfilNome)) ?? [];

  const { data, isLoading } = useOrdensServico({
    page,
    size,
    // Mais recente primeiro — mesma convenção de OrcamentosPage, pra a
    // última OS aberta/aprovada aparecer no topo da lista em vez de ficar
    // perdida nas últimas páginas conforme o histórico cresce.
    sort: 'id,desc',
    status: status || undefined,
    numero: numero || undefined,
    usuarioResponsavelId: tecnicoId || undefined,
  });

  async function baixarPdf(row: OrdemServicoResponse) {
    try {
      await openPdfInNewTab(() => buildOrdemServicoPdfBlob(row), `os-${row.numero ?? row.id}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  function selecionarStatus(novoStatus: OrdemServicoStatus | '') {
    setStatus(novoStatus);
    setPage(0);
  }

  const statusOutroAtivo = status !== '' && statusOutros.includes(status);

  return (
    <div>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Núcleo operacional da oficina"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={numero}
          onChange={(value) => {
            setNumero(value);
            setPage(0);
          }}
          placeholder="Buscar por número da OS..."
          className="w-full max-w-xs"
        />

        <div className="flex min-w-0 max-w-full gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => selecionarStatus('')}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              status === ''
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-border text-ink-muted hover:bg-surface-alt hover:text-ink',
            )}
          >
            Todos
          </button>
          {statusEmDestaque.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selecionarStatus(s)}
              className={clsx(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                status === s
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border text-ink-muted hover:bg-surface-alt hover:text-ink',
              )}
            >
              {metaFor(ordemServicoStatusMeta, s).label}
            </button>
          ))}
        </div>

        <select
          value={statusOutroAtivo ? status : ''}
          onChange={(e) => selecionarStatus(e.target.value as OrdemServicoStatus | '')}
          className={selectCompacto}
        >
          <option value="">Mais status…</option>
          {statusOutros.map((s) => (
            <option key={s} value={s}>
              {metaFor(ordemServicoStatusMeta, s).label}
            </option>
          ))}
        </select>

        {mecanicos.length > 0 && (
          <select
            value={tecnicoId}
            onChange={(e) => {
              setTecnicoId(e.target.value ? Number(e.target.value) : '');
              setPage(0);
            }}
            className={selectCompacto}
          >
            <option value="">Técnico: Todos</option>
            {mecanicos.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      <Card>
        <DataTable<OrdemServicoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhuma Ordem de Serviço encontrada"
          columns={[
            {
              header: 'Número',
              render: (row) => (
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  {row.tempoEstourado && (
                    <AlertTriangle size={14} className="shrink-0 text-danger" aria-label="Tempo estourado" />
                  )}
                  {row.numero ?? row.id}
                </span>
              ),
            },
            { header: 'Cliente', render: (row) => `${row.clienteNome ?? ''} — ${row.veiculoPlaca ?? ''}` },
            { header: 'Técnico', render: (row) => row.usuarioResponsavelNome || '-', hideBelow: 'md' },
            { header: 'Abertura', render: (row) => formatDate(row.dataAbertura), hideBelow: 'sm' },
            { header: 'Valor', render: (row) => formatCurrency(row.valorTotal), hideBelow: 'md' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(ordemServicoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            {
              header: '',
              render: (row) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    baixarPdf(row);
                  }}
                >
                  <FileDown size={14} /> PDF
                </Button>
              ),
            },
          ]}
          onRowClick={(row) => navigate(`${linkDetalheOS}/${row.id}`)}
        />
        {data && (
          <Pagination
            page={data.pageNumber}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onChange={setPage}
            pageSize={size}
            onPageSizeChange={(novoTamanho) => {
              setSize(novoTamanho);
              setPage(0);
            }}
          />
        )}
      </Card>
    </div>
  );
}
