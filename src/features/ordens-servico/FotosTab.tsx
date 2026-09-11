import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFotos, useAdicionarFoto, useRemoverFoto } from '@/hooks/useChecklistsFotos';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  url: z.string().url('Informe uma URL válida'),
  descricao: z.string().optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'EVIDENCIA']),
});

type FormValues = z.infer<typeof schema>;

export function FotosTab({ ordemServicoId }: { ordemServicoId: number }) {
  const { data: fotos, isLoading } = useFotos(ordemServicoId);
  const adicionar = useAdicionarFoto(ordemServicoId);
  const remover = useRemoverFoto(ordemServicoId);
  const [adding, setAdding] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { tipo: 'EVIDENCIA' } });

  async function onSubmit(values: FormValues) {
    try {
      await adicionar.mutateAsync(values);
      toast.success('Foto adicionada.');
      reset({ tipo: 'EVIDENCIA', url: '', descricao: '' });
      setAdding(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível adicionar a foto.'));
    }
  }

  async function handleRemove(id: number) {
    try {
      await remover.mutateAsync(id);
      toast.success('Foto removida.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover a foto.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!adding && (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setAdding(true)}>
          <Plus size={16} /> Adicionar foto
        </Button>
      )}

      {adding && (
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
              <Input
                label="URL da imagem"
                placeholder="https://..."
                hint="Cole a URL de uma imagem já hospedada (ex.: enviada para um serviço de armazenamento)"
                required
                error={errors.url?.message}
                {...register('url')}
              />
              <Select label="Tipo" {...register('tipo')}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
                <option value="EVIDENCIA">Evidência</option>
              </Select>
              <Input label="Descrição" {...register('descricao')} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={adicionar.isPending}>
                  Salvar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {!isLoading && fotos?.length === 0 && !adding && <EmptyState icon={ImageOff} title="Nenhuma foto anexada" />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fotos?.map((foto) => (
          <div key={foto.id} className="group relative overflow-hidden rounded-xl border border-border">
            <img src={foto.url} alt={foto.descricao ?? 'Foto da OS'} className="h-32 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-900/60 px-2 py-1">
              <span className="truncate text-xs text-white">{foto.tipo}</span>
              <button onClick={() => handleRemove(foto.id!)} className="text-white hover:text-red-300" aria-label="Remover foto">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
