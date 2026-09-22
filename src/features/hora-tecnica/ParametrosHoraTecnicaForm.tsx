import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useAtualizarParametrosHoraTecnica } from '@/hooks/useHoraTecnica';
import type { HoraTecnicaResponse } from '@/api/types';
import { formatCurrency, formatHorasDecimais } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

// Mesmos limites do ParametrosHoraTecnicaRequest + a regra de soma de
// HoraTecnicaService (impostos + margem < 100%) — validar aqui só antecipa o
// erro pro campo certo, o backend continua sendo quem decide.
const numero = (msg: string) => z.coerce.number({ invalid_type_error: msg });
const schema = z
  .object({
    numeroMecanicos: numero('Informe o número de mecânicos').int('Use um número inteiro').min(1, 'Mínimo 1').max(1000),
    horasPorDia: numero('Informe as horas por dia').gt(0, 'Deve ser maior que zero').max(24, 'Máximo 24'),
    diasUteisMes: numero('Informe os dias úteis').int('Use um número inteiro').min(1, 'Mínimo 1').max(31, 'Máximo 31'),
    eficienciaPercentual: numero('Informe a eficiência').gt(0, 'Deve ser maior que zero').max(100, 'Máximo 100%'),
    impostosPercentual: numero('Informe os impostos').min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
    margemLucroPercentual: numero('Informe a margem').min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
  })
  .refine((v) => v.impostosPercentual + v.margemLucroPercentual < 100, {
    message: 'Impostos + margem precisam somar menos de 100%',
    path: ['margemLucroPercentual'],
  });

type FormValues = z.infer<typeof schema>;

const PADRAO: FormValues = {
  numeroMecanicos: 1,
  horasPorDia: 8,
  diasUteisMes: 22,
  eficienciaPercentual: 80,
  impostosPercentual: 10,
  margemLucroPercentual: 20,
};

/**
 * Prévia do PHT enquanto o admin digita, pra ele ver o efeito antes de salvar.
 * Mesma fórmula documentada em V18__hora_tecnica.sql (HP = Nm×Hd×Dm×Ef; CH =
 * CF/HP; PHT = CH/(1−(Imp+Mg)/100)). É só uma estimativa visual — o valor que
 * vale é sempre o que o backend devolve depois de salvar.
 */
function previaPht(v: Partial<FormValues>, custosFixos: number | undefined) {
  const n = (x: unknown) => Number(x) || 0;
  const hp = n(v.numeroMecanicos) * n(v.horasPorDia) * n(v.diasUteisMes) * (n(v.eficienciaPercentual) / 100);
  const divisor = 1 - (n(v.impostosPercentual) + n(v.margemLucroPercentual)) / 100;
  if (!custosFixos || hp <= 0 || divisor <= 0) return { hp: hp || undefined, pht: undefined };
  return { hp, pht: custosFixos / hp / divisor };
}

export function ParametrosHoraTecnicaForm({ horaTecnica }: { horaTecnica: HoraTecnicaResponse | undefined }) {
  const mutation = useAtualizarParametrosHoraTecnica();
  const composicao = horaTecnica?.composicao;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: PADRAO });

  // Parâmetros salvos têm numeroMecanicos preenchido; sem isso a oficina
  // nunca configurou e o form fica com valores de partida sugeridos.
  // Dependências são só os campos de parâmetro (primitivos), não o objeto
  // `composicao`: cadastrar um custo fixo refaz a consulta e troca a
  // referência, e isso não pode apagar o que o admin estava digitando aqui.
  const salvos = composicao?.numeroMecanicos != null ? composicao : undefined;
  const { numeroMecanicos, horasPorDia, diasUteisMes, eficienciaPercentual, impostosPercentual, margemLucroPercentual } =
    salvos ?? {};
  useEffect(() => {
    if (numeroMecanicos == null) return;
    reset({
      numeroMecanicos,
      horasPorDia: horasPorDia ?? PADRAO.horasPorDia,
      diasUteisMes: diasUteisMes ?? PADRAO.diasUteisMes,
      eficienciaPercentual: eficienciaPercentual ?? PADRAO.eficienciaPercentual,
      impostosPercentual: impostosPercentual ?? PADRAO.impostosPercentual,
      margemLucroPercentual: margemLucroPercentual ?? PADRAO.margemLucroPercentual,
    });
  }, [numeroMecanicos, horasPorDia, diasUteisMes, eficienciaPercentual, impostosPercentual, margemLucroPercentual, reset]);

  const previa = previaPht(watch(), composicao?.custosFixos);

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Parâmetros salvos. O novo preço da hora técnica já vale para os consultores.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar os parâmetros.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title="Parâmetros de capacidade e preço"
        subtitle="Toda alteração fica registrada no histórico com o usuário e a data"
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Capacidade produtiva
            </legend>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Input label="Mecânicos" type="number" required error={errors.numeroMecanicos?.message} {...register('numeroMecanicos')} />
              <Input label="Horas por dia" type="number" step="0.5" required error={errors.horasPorDia?.message} {...register('horasPorDia')} />
              <Input label="Dias úteis no mês" type="number" required error={errors.diasUteisMes?.message} {...register('diasUteisMes')} />
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
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Preço</legend>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Input label="Impostos (%)" type="number" step="0.1" required error={errors.impostosPercentual?.message} {...register('impostosPercentual')} />
              <Input label="Margem de lucro (%)" type="number" step="0.1" required error={errors.margemLucroPercentual?.message} {...register('margemLucroPercentual')} />
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <Sparkles size={16} className="shrink-0 text-brand-500" />
              {previa.pht != null ? (
                <span>
                  Prévia: <strong className="text-ink">{formatCurrency(previa.pht)}/h</strong> com{' '}
                  {formatHorasDecimais(previa.hp)} produtivas
                </span>
              ) : (
                <span>Cadastre ao menos um custo fixo para ver a prévia do preço.</span>
              )}
            </div>
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty && composicao?.numeroMecanicos != null}>
              <Save size={16} /> Salvar parâmetros
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
