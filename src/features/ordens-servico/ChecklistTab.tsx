import { useState } from 'react';
import { useFieldArray, useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Select, Input, Textarea } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChecklists, useCriarChecklist } from '@/hooks/useChecklistsFotos';
import { checklistSituacaoMeta, metaFor } from '@/lib/statusMeta';
import { formatDateTime } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { ClipboardCheck } from 'lucide-react';

const itemSchema = z.object({
  descricao: z.string().min(1, 'Informe a descrição'),
  situacao: z.enum(['OK', 'ATENCAO', 'DEFEITO', 'NAO_APLICAVEL']),
  observacao: z.string().optional(),
});

const schema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  observacoesGerais: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione ao menos um item'),
});

type FormValues = z.infer<typeof schema>;

export function ChecklistTab({ ordemServicoId }: { ordemServicoId: number }) {
  const { data: checklists, isLoading } = useChecklists(ordemServicoId);
  const criar = useCriarChecklist(ordemServicoId);
  const [creating, setCreating] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'ENTRADA', itens: [{ descricao: '', situacao: 'OK', observacao: '' }] },
  });
  const { control, register, handleSubmit, reset, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });

  async function onSubmit(values: FormValues) {
    try {
      await criar.mutateAsync(values);
      toast.success('Checklist registrado.');
      reset({ tipo: 'ENTRADA', itens: [{ descricao: '', situacao: 'OK', observacao: '' }] });
      setCreating(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar o checklist.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!creating && (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo checklist
        </Button>
      )}

      {creating && (
        <FormProvider {...methods}>
          <Card>
            <CardBody className="flex flex-col gap-3">
              <Select label="Tipo de checklist" {...register('tipo')}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </Select>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-5">
                    <Input label="Item verificado" {...register(`itens.${index}.descricao`)} />
                  </div>
                  <div className="sm:col-span-3">
                    <Controller
                      control={control}
                      name={`itens.${index}.situacao`}
                      render={({ field: f }) => (
                        <Select label="Situação" {...f}>
                          <option value="OK">OK</option>
                          <option value="ATENCAO">Atenção</option>
                          <option value="DEFEITO">Defeito</option>
                          <option value="NAO_APLICAVEL">Não aplicável</option>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input label="Observação" {...register(`itens.${index}.observacao`)} />
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <button type="button" onClick={() => remove(index)} className="rounded-md p-2 text-ink-muted hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {errors.itens && !Array.isArray(errors.itens) && (
                <p className="text-xs font-medium text-danger">{errors.itens.message as string}</p>
              )}

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="self-start"
                onClick={() => append({ descricao: '', situacao: 'OK', observacao: '' })}
              >
                <Plus size={14} /> Adicionar item
              </Button>

              <Textarea label="Observações gerais" {...register('observacoesGerais')} />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit(onSubmit)} loading={criar.isPending}>
                  Salvar checklist
                </Button>
              </div>
            </CardBody>
          </Card>
        </FormProvider>
      )}

      {!isLoading && checklists?.length === 0 && !creating && (
        <EmptyState icon={ClipboardCheck} title="Nenhum checklist registrado" />
      )}

      {checklists?.map((cl) => (
        <Card key={cl.id}>
          <CardBody>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-ink">Checklist de {cl.tipo === 'ENTRADA' ? 'entrada' : 'saída'}</p>
              <span className="text-xs text-ink-muted">{formatDateTime(cl.dataHora)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {cl.itens?.map((item, i) => {
                const meta = metaFor(checklistSituacaoMeta, item.situacao);
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{item.descricao}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
            {cl.observacoesGerais && <p className="mt-2 text-sm text-ink-muted">{cl.observacoesGerais}</p>}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
