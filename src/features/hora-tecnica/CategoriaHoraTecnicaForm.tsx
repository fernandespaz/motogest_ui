import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useAtualizarHoraTecnica } from '@/hooks/useHoraTecnica';
import type { CategoriaHoraTecnicaResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const numero = (msg: string) => z.coerce.number({ invalid_type_error: msg });
const schema = z.object({
  valorHoraA: numero('Informe o valor da categoria A').min(0, 'Mínimo 0'),
  valorHoraB: numero('Informe o valor da categoria B').min(0, 'Mínimo 0'),
  valorHoraC: numero('Informe o valor da categoria C').min(0, 'Mínimo 0'),
  arredondamentoComercial: numero('Informe o arredondamento').int('Use um número inteiro').positive('Deve ser maior que zero'),
});

type FormValues = z.infer<typeof schema>;

const PADRAO: FormValues = { valorHoraA: 0, valorHoraB: 0, valorHoraC: 0, arredondamentoComercial: 5 };

export function CategoriaHoraTecnicaForm({ categorias }: { categorias: CategoriaHoraTecnicaResponse[] | undefined }) {
  const mutation = useAtualizarHoraTecnica();
  const configurado = (categorias?.length ?? 0) > 0;
  const porCategoria = new Map(categorias?.map((c) => [c.categoria, c]));
  const salvoA = porCategoria.get('A');
  const salvoB = porCategoria.get('B');
  const salvoC = porCategoria.get('C');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: PADRAO });

  // Dependências são só os valores primitivos salvos, não o array `categorias`
  // (nova referência a cada refetch) — evita apagar o que o admin está
  // digitando quando a query só revalida em segundo plano.
  useEffect(() => {
    if (!configurado) return;
    reset({
      valorHoraA: salvoA?.valorHora ?? PADRAO.valorHoraA,
      valorHoraB: salvoB?.valorHora ?? PADRAO.valorHoraB,
      valorHoraC: salvoC?.valorHora ?? PADRAO.valorHoraC,
      arredondamentoComercial: salvoA?.arredondamentoComercial ?? PADRAO.arredondamentoComercial,
    });
  }, [configurado, salvoA?.valorHora, salvoB?.valorHora, salvoC?.valorHora, salvoA?.arredondamentoComercial, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync({
        categorias: [
          { categoria: 'A', valorHora: values.valorHoraA },
          { categoria: 'B', valorHora: values.valorHoraB },
          { categoria: 'C', valorHora: values.valorHoraC },
        ],
        arredondamentoComercial: values.arredondamentoComercial,
      });
      toast.success('Hora técnica salva. Os novos valores já valem para os consultores.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar a hora técnica.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title="Valor da hora técnica por categoria"
        subtitle="Toda alteração fica registrada no histórico com o usuário e a data"
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          {!configurado && (
            <p className="text-sm text-ink-muted">
              Nenhuma categoria configurada ainda — defina o valor da hora para A, B e C antes de gerar orçamentos ou OS
              com tempo vendido.
            </p>
          )}
          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <legend className="sr-only">Valor da hora por categoria</legend>
            <Input
              label="Categoria A (R$/h)"
              type="number"
              step="0.01"
              required
              error={errors.valorHoraA?.message}
              {...register('valorHoraA')}
            />
            <Input
              label="Categoria B (R$/h)"
              type="number"
              step="0.01"
              required
              error={errors.valorHoraB?.message}
              {...register('valorHoraB')}
            />
            <Input
              label="Categoria C (R$/h)"
              type="number"
              step="0.01"
              required
              error={errors.valorHoraC?.message}
              {...register('valorHoraC')}
            />
          </fieldset>

          <div className="max-w-xs">
            <Input
              label="Arredondamento comercial (R$)"
              type="number"
              step="1"
              required
              hint="O preço calculado de cada serviço arredonda para cima em múltiplos desse valor"
              error={errors.arredondamentoComercial?.message}
              {...register('arredondamentoComercial')}
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty && configurado}>
              <Save size={16} /> Salvar hora técnica
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
