import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUsuarios, useDeleteUsuario } from '@/hooks/useUsuarios';
import type { UsuarioResponse } from '@/api/types';
import { UsuarioFormModal } from './UsuarioFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export function UsuariosPage() {
  const [modalUsuario, setModalUsuario] = useState<UsuarioResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<UsuarioResponse | null>(null);
  const usuarioIdAtual = useAuthStore((s) => s.usuarioId);

  const { data, isLoading } = useUsuarios();
  const deleteMutation = useDeleteUsuario();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Usuário removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o usuário.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Pessoas com acesso ao sistema na sua oficina"
        action={
          <Button onClick={() => setModalUsuario(null)}>
            <Plus size={18} /> Novo usuário
          </Button>
        }
      />

      <Card>
        <DataTable<UsuarioResponse>
          loading={isLoading}
          rows={data ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum usuário cadastrado"
          columns={[
            { header: 'Nome', render: (row) => <span className="font-medium text-ink">{row.nome}</span> },
            { header: 'E-mail', render: (row) => row.email, hideBelow: 'sm' },
            { header: 'Perfil', render: (row) => <Badge tone="brand">{row.perfilNome}</Badge> },
            {
              header: 'Status',
              render: (row) => <Badge tone={row.ativo === false ? 'neutral' : 'success'}>{row.ativo === false ? 'Inativo' : 'Ativo'}</Badge>,
              hideBelow: 'sm',
            },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => setModalUsuario(row)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700">
                    <Pencil size={16} />
                  </button>
                  {row.id !== usuarioIdAtual && (
                    <button onClick={() => setDeleting(row)} className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setModalUsuario(row)}
        />
      </Card>

      <UsuarioFormModal open={modalUsuario !== undefined} onClose={() => setModalUsuario(undefined)} usuario={modalUsuario} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover usuário"
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
