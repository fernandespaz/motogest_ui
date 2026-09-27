import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconActionButton } from '@/components/ui/IconActionButton';
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
                  <IconActionButton icon={PencilSimple} label="Editar" tone="brand" onClick={() => setModalPerfil(row)} />
                  <IconActionButton icon={Trash} label="Remover" tone="danger" onClick={() => setDeleting(row)} />
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
