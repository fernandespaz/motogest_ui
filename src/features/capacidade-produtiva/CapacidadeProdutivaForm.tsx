import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useAtualizarCapacidadeProdutiva } from '@/hooks/useCapacidadeProdutiva';
import type { CapacidadeProdutivaResponse } from '@/api/types';
import { formatHorasDecimais } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const numero = (msg: string) => z.coerce.number({ invalid_type_error: msg });
const schema = z.object({
  numeroMecanicos: numero('Informe o número de mecânicos').int('Use um número inteiro').min(1, 'Mínimo 1').max(1000),
  horasPorDia: numero('Informe as horas por dia').gt(0, 'Deve ser maior que zero').max(24, 'Máximo 24'),
  diasUteisMes: numero('Informe os dias úteis').int('Use um número inteiro').min(1, 'Mínimo 1').max(31, 'Máximo 31'),
  eficienciaPercentual: numero('Informe a eficiência').gt(0, 'Deve ser maior que zero').max(100, 'Máximo 100%'),
});

type FormValues = z.infer<typeof schema>;

const PADRAO: FormValues = { numeroMecanicos: 1, horasPorDia: 8, diasUteisMes: 22, eficienciaPercentual: 80 };

/** Prévia local enquanto o admin digita — o valor que vale é sempre o que o backend devolve depois de salvar. */
function previaHorasProdutivas(v: Partial<FormValues>) {
  const n = (x: unknown) => Number(x) || 0;
  const hp = n(v.numeroMecanicos) * n(v.horasPorDia) * n(v.diasUteisMes) * (n(v.eficienciaPercentual) / 100);
  return hp > 0 ? hp : undefined;
}

export function CapacidadeProdutivaForm({ capacidade }: { capacidade: CapacidadeProdutivaResponse | undefined }) {
  const mutation = useAtualizarCapacidadeProdutiva();
  const configurado = capacidade?.configurado === true;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: PADRAO });

  const { numeroMecanicos, horasPorDia, diasUteisMes, eficienciaPercentual } = capacidade ?? {};
  useEffect(() => {
    if (!configurado) return;
    reset({
      numeroMecanicos: numeroMecanicos ?? PADRAO.numeroMecanicos,
      horasPorDia: horasPorDia ?? PADRAO.horasPorDia,
      diasUteisMes: diasUteisMes ?? PADRAO.diasUteisMes,
      eficienciaPercentual: eficienciaPercentual ?? PADRAO.eficienciaPercentual,
    });
  }, [configurado, numeroMecanicos, horasPorDia, diasUteisMes, eficienciaPercentual, reset]);

  const previa = configurado ? capacidade?.horasProdutivas : previaHorasProdutivas(watch());

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Capacidade produtiva salva.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar a capacidade produtiva.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title="Capacidade produtiva"
        subtitle="Toda alteração fica registrada no histórico com o usuário e a data"
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          {!configurado && (
            <p className="text-sm text-ink-muted">Nenhuma capacidade configurada ainda — informe os valores abaixo.</p>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Input
              label="Mecânicos"
              type="number"
              required
              error={errors.numeroMecanicos?.message}
              {...register('numeroMecanicos')}
            />
            <Input
              label="Horas por dia"
              type="number"
              step="0.5"
              required
              error={errors.horasPorDia?.message}
              {...register('horasPorDia')}
            />
            <Input
              label="Dias úteis no mês"
              type="number"
              required
              error={errors.diasUteisMes?.message}
              {...register('diasUteisMes')}
            />
            <Input
              label="Eficiência (%)"
              type="number"
              step="0.1"
              required
              hint="Parte do tempo realmente vendável"
              error={errors.eficienciaPercentual?.message}
              {...register('eficienciaPercentual')}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <Sparkles size={16} className="shrink-0 text-brand-500" />
              {previa != null ? (
                <span>
                  {configurado ? 'Capacidade atual' : 'Prévia'}:{' '}
                  <strong className="text-ink">{formatHorasDecimais(previa)}</strong> produtivas/mês
                </span>
              ) : (
                <span>Preencha os campos para ver a prévia da capacidade produtiva.</span>
              )}
            </div>
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty && configurado}>
              <Save size={16} /> Salvar capacidade
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
