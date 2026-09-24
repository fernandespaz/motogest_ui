import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/Field';
import { useCreatePerfil, useUpdatePerfil, usePermissoesDisponiveis } from '@/hooks/usePerfis';
import type { PerfilResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { PERFIL_PRESETS, type PerfilPresetKey } from './perfilPresets';
import { PERMISSAO_CATEGORIA_LABELS, PERMISSAO_CATEGORIA_ORDEM, agruparPermissoesPorCategoria } from './permissaoCategoria';

const FORM_ID = 'perfil-form';

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
  const permissoesPorCategoria = useMemo(
    () => agruparPermissoesPorCategoria(permissoesDisponiveis),
    [permissoesDisponiveis],
  );
  const createMutation = useCreatePerfil();
  const updateMutation = useUpdatePerfil();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
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

  function applyPreset(key: PerfilPresetKey | '') {
    if (!key) return;
    const preset = PERFIL_PRESETS[key];
    const codigos =
      key === 'ADMIN' ? (permissoesDisponiveis?.map((p) => p.codigo!).filter(Boolean) ?? []) : preset.permissoes;
    setValue('permissoes', codigos, { shouldValidate: true, shouldDirty: true });
  }

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
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar perfil de acesso' : 'Novo perfil de acesso'}
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
        <Textarea label="Descrição" {...register('descricao')} />

        {!isEditing && (
          <Select
            label="Aplicar modelo"
            hint="Preenche as permissões abaixo como ponto de partida — continue editando à vontade."
            defaultValue=""
            onChange={(e) => applyPreset(e.target.value as PerfilPresetKey | '')}
          >
            <option value="">Começar em branco</option>
            {(Object.entries(PERFIL_PRESETS) as [PerfilPresetKey, (typeof PERFIL_PRESETS)[PerfilPresetKey]][]).map(
              ([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ),
            )}
          </Select>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            Permissões <span className="text-danger">*</span>
          </p>
          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            {PERMISSAO_CATEGORIA_ORDEM.filter((categoria) => (permissoesPorCategoria.get(categoria)?.length ?? 0) > 0).map(
              (categoria, i) => (
                <fieldset key={categoria} className={i > 0 ? 'border-t border-border pt-4' : ''}>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                    {PERMISSAO_CATEGORIA_LABELS[categoria]}
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {permissoesPorCategoria.get(categoria)!.map((perm) => (
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
                </fieldset>
              ),
            )}
          </div>
          {errors.permissoes && <p className="mt-1 text-xs font-medium text-danger">{errors.permissoes.message}</p>}
        </div>
      </form>
    </Modal>
  );
}
