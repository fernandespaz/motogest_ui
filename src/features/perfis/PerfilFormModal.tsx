import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Checkbox } from '@/components/ui/Field';
import { useCreatePerfil, useUpdatePerfil, usePermissoesDisponiveis } from '@/hooks/usePerfis';
import type { PerfilResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  descricao: z.string().optional(),
  permissoes: z.array(z.string()).min(1, 'Selecione ao menos uma permissão'),
});

type FormValues = z.infer<typeof schema>;

export function PerfilFormModal({
  open,
  onClose,
  perfil,
}: {
  open: boolean;
  onClose: () => void;
  perfil?: PerfilResponse | null;
}) {
  const isEditing = !!perfil;
  const { data: permissoesDisponiveis } = usePermissoesDisponiveis();
  const createMutation = useCreatePerfil();
  const updateMutation = useUpdatePerfil();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { permissoes: [] } });

  useEffect(() => {
    if (open) {
      reset(
        perfil
          ? {
              nome: perfil.nome ?? '',
              descricao: perfil.descricao ?? '',
              permissoes: perfil.permissoes?.map((p) => p.codigo!).filter(Boolean) ?? [],
            }
          : { permissoes: [] },
      );
    }
  }, [open, perfil, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && perfil?.id != null) {
        await updateMutation.mutateAsync({ id: perfil.id, payload: values });
        toast.success('Perfil atualizado.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Perfil cadastrado.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o perfil.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar perfil de acesso' : 'Novo perfil de acesso'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
        <Textarea label="Descrição" {...register('descricao')} />

        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            Permissões <span className="text-danger">*</span>
          </p>
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
            {permissoesDisponiveis?.map((perm) => (
              <Controller
                key={perm.id}
                control={control}
                name="permissoes"
                render={({ field }) => (
                  <Checkbox
                    label={perm.descricao ?? perm.codigo ?? ''}
                    checked={field.value?.includes(perm.codigo!)}
                    onChange={(e) => {
                      const set = new Set(field.value ?? []);
                      if (e.target.checked) set.add(perm.codigo!);
                      else set.delete(perm.codigo!);
                      field.onChange(Array.from(set));
                    }}
                  />
                )}
              />
            ))}
          </div>
          {errors.permissoes && <p className="mt-1 text-xs font-medium text-danger">{errors.permissoes.message}</p>}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
