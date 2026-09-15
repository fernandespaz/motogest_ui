import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, UserPlus, Bike } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useVeiculos, useDeleteVeiculo } from '@/hooks/useVeiculos';
import { useClientes } from '@/hooks/useClientes';
import { useModelosVeiculo } from '@/hooks/useModelosVeiculo';
import type { VeiculoResponse } from '@/api/types';
import { VeiculoFormModal } from './VeiculoFormModal';
import { ModeloVeiculoThumb } from '@/features/shared/ModeloVeiculoField';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

function MarcaModeloCell({ marca, modelo, imagem }: { marca?: string | null; modelo?: string | null; imagem?: string }) {
  return (
    <div className="flex items-center gap-2">
      <ModeloVeiculoThumb base64={imagem} size={28} />
      <span>{`${marca ?? ''} ${modelo ?? ''}`.trim() || '—'}</span>
    </div>
  );
}

export function VeiculosPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [modalVeiculo, setModalVeiculo] = useState<VeiculoResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<VeiculoResponse | null>(null);

  const { data, isLoading } = useVeiculos({ page, size: 20 });
  const { data: clientesCheck, isLoading: loadingClientesCheck } = useClientes({ size: 1 });
  // Busca o catálogo inteiro uma vez em vez de um request por linha — a
  // miniatura é só um casamento por marca+modelo em memória, sem custo extra
  // de rede por veículo listado.
  const { data: catalogo } = useModelosVeiculo({ size: 100 }, { silentError: true });
  const imagensPorModelo = useMemo(() => {
    const mapa = new Map<string, string | undefined>();
    for (const m of catalogo?.content ?? []) {
      if (m.marca && m.modelo) mapa.set(`${m.marca.toLowerCase()} ${m.modelo.toLowerCase()}`, m.imagemBase64);
    }
    return mapa;
  }, [catalogo]);
  const deleteMutation = useDeleteVeiculo();

  // A veículo always belongs to a cliente — sending someone to an empty selector
  // is the exact friction this page used to have, so redirect the intent instead.
  const semClientes = !loadingClientesCheck && (clientesCheck?.totalElements ?? 0) === 0;

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Veículo removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o veículo.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Veículos"
        subtitle="Veículos vinculados aos clientes da oficina"
        action={
          semClientes ? (
            <Button onClick={() => navigate('/clientes')}>
              <UserPlus size={18} /> Cadastrar cliente
            </Button>
          ) : (
            <Button onClick={() => setModalVeiculo(null)}>
              <Plus size={18} /> Novo veículo
            </Button>
          )
        }
      />

      <Card>
        <DataTable<VeiculoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyIcon={semClientes ? UserPlus : Bike}
          emptyTitle={semClientes ? 'Cadastre um cliente primeiro' : 'Nenhum veículo cadastrado'}
          emptyDescription={
            semClientes
              ? 'Todo veículo precisa estar vinculado a um cliente — comece por lá.'
              : 'Cadastre o primeiro veículo vinculado a um cliente.'
          }
          emptyAction={
            semClientes ? (
              <Button size="sm" onClick={() => navigate('/clientes')}>
                <UserPlus size={16} /> Cadastrar cliente
              </Button>
            ) : (
              <Button size="sm" onClick={() => setModalVeiculo(null)}>
                <Plus size={16} /> Novo veículo
              </Button>
            )
          }
          columns={[
            {
              header: 'Placa',
              render: (row) => <span className="font-medium text-ink">{row.placa}</span>,
            },
            {
              header: 'Marca / Modelo',
              render: (row) => (
                <MarcaModeloCell
                  marca={row.marca}
                  modelo={row.modelo}
                  imagem={row.marca && row.modelo ? imagensPorModelo.get(`${row.marca.toLowerCase()} ${row.modelo.toLowerCase()}`) : undefined}
                />
              ),
            },
            { header: 'Cliente', render: (row) => row.clienteNome ?? '—', hideBelow: 'sm' },
            { header: 'KM atual', render: (row) => (row.kmAtual != null ? row.kmAtual.toLocaleString('pt-BR') : '—'), hideBelow: 'md' },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalVeiculo(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                    aria-label="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                    aria-label="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setModalVeiculo(row)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <VeiculoFormModal open={modalVeiculo !== undefined} onClose={() => setModalVeiculo(undefined)} veiculo={modalVeiculo} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover veículo"
        description={`Tem certeza que deseja remover a placa "${deleting?.placa}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
