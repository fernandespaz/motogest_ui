import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { useConfiguracaoComissao, useSalvarConfiguracaoComissao } from '@/hooks/useComissoes';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const percentual = (msg: string) =>
  z.coerce
    .number({ invalid_type_error: msg })
    .min(0, 'Mínimo 0')
    .max(100, 'Máximo 100')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, 'Até 2 casas decimais');

const schema = z.object({
  mecanicoPercentual: percentual('Informe o percentual do mecânico'),
  consultorPercentual: percentual('Informe o percentual do consultor'),
  mecanicoIncluiProdutos: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const PADRAO: FormValues = { mecanicoPercentual: 0, consultorPercentual: 0, mecanicoIncluiProdutos: false };

/** Pressupõe HORA_TECNICA_GERENCIAR (gate na rota). A configuração vale para todas as categorias A/B/C. */
export function ComissaoConfigCard() {
  const { data, isLoading, isError } = useConfiguracaoComissao();
  const mutation = useSalvarConfiguracaoComissao();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: PADRAO });

  // Só os primitivos salvos: o objeto `data` ganha nova referência a cada revalidação e apagaria o que está sendo digitado.
  const salvoMecanico = data?.mecanicoPercentual;
  const salvoConsultor = data?.consultorPercentual;
  const salvoIncluiProdutos = data?.mecanicoIncluiProdutos;
  useEffect(() => {
    if (salvoMecanico == null) return;
    reset({
      mecanicoPercentual: salvoMecanico,
      consultorPercentual: salvoConsultor ?? 0,
      mecanicoIncluiProdutos: salvoIncluiProdutos ?? false,
    });
  }, [salvoMecanico, salvoConsultor, salvoIncluiProdutos, reset]);

  if (isLoading) return <PageSpinner label="Carregando comissões..." />;
  // Sem os valores atuais, salvar sobrescreveria a configuração real com zeros.
  if (isError || !data) {
    return <p className="text-sm text-ink-muted">Não foi possível carregar a configuração de comissões; a edição fica bloqueada.</p>;
  }

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Comissões salvas. Valem para as comissões geradas a partir de agora.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar as comissões.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title="Comissões"
        subtitle="Mecânico: sobre os serviços da OS (com a opção marcada, serviços + produtos). Consultor: sobre o valor fechado da OS. 0% = sem comissão."
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Comissão do mecânico (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              hint="Gerada quando a OS é concluída"
              error={errors.mecanicoPercentual?.message}
              {...register('mecanicoPercentual')}
            />
            <Input
              label="Comissão do consultor (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              hint="Gerada quando a OS é faturada (pago no caixa)"
              error={errors.consultorPercentual?.message}
              {...register('consultorPercentual')}
            />
          </div>
          <Checkbox label="Incluir produtos na base da comissão do mecânico" {...register('mecanicoIncluiProdutos')} />
          <p className="text-xs text-ink-muted">
            Comissões já geradas não mudam: o percentual e a base ficam gravados em cada uma.
          </p>
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
              <Save size={16} /> Salvar comissões
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
