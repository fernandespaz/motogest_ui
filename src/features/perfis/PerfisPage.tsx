import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePerfis, useDeletePerfil } from '@/hooks/usePerfis';
import type { PerfilResponse } from '@/api/types';
import { PerfilFormModal } from './PerfilFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function PerfisPage() {
  const [modalPerfil, setModalPerfil] = useState<PerfilResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<PerfilResponse | null>(null);

  const { data, isLoading } = usePerfis();
  const deleteMutation = useDeletePerfil();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Perfil removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o perfil.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Perfis de Acesso"
        subtitle="Grupos de permissões atribuídos aos usuários"
        action={
          <Button onClick={() => setModalPerfil(null)}>
            <Plus size={18} /> Novo perfil
          </Button>
        }
      />

      <Card>
        <DataTable<PerfilResponse>
          loading={isLoading}
          rows={data ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum perfil cadastrado"
          columns={[
            { header: 'Nome', render: (row) => <span className="font-medium text-ink">{row.nome}</span> },
            { header: 'Descrição', render: (row) => row.descricao || '—', hideBelow: 'sm' },
            { header: 'Permissões', render: (row) => <Badge tone="brand">{row.permissoes?.length ?? 0}</Badge> },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => setModalPerfil(row)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleting(row)} className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setModalPerfil(row)}
        />
      </Card>

      <PerfilFormModal open={modalPerfil !== undefined} onClose={() => setModalPerfil(undefined)} perfil={modalPerfil} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover perfil"
        description={`Tem certeza que deseja remover "${deleting?.nome}"?`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
