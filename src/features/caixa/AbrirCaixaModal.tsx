import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useAbrirCaixaSessao } from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  turno: z.string().min(1, 'Informe o turno'),
  saldoInicialDinheiro: z.coerce.number().min(0, 'Informe um valor válido').default(0),
  saldoInicialCartao: z.coerce.number().min(0, 'Informe um valor válido').default(0),
  saldoInicialPix: z.coerce.number().min(0, 'Informe um valor válido').default(0),
  saldoInicialTransferencia: z.coerce.number().min(0, 'Informe um valor válido').default(0),
});

type FormValues = z.infer<typeof schema>;

export function AbrirCaixaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const abrir = useAbrirCaixaSessao();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      turno: '',
      saldoInicialDinheiro: 0,
      saldoInicialCartao: 0,
      saldoInicialPix: 0,
      saldoInicialTransferencia: 0,
    },
  });

  function fechar() {
    reset();
    onClose();
  }

  async function onSubmit(values: FormValues) {
    try {
      await abrir.mutateAsync(values);
      toast.success('Caixa aberto.');
      fechar();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível abrir o caixa.'));
    }
  }

  return (
    <Modal open={open} onClose={fechar} title="Abrir caixa">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Turno"
          placeholder="Ex.: Manhã, Tarde, Turno único"
          required
          error={errors.turno?.message}
          {...register('turno')}
        />
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Saldo inicial por forma de pagamento</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dinheiro (R$)"
            type="number"
            step="0.01"
            error={errors.saldoInicialDinheiro?.message}
            {...register('saldoInicialDinheiro')}
          />
          <Input
            label="Cartão (R$)"
            type="number"
            step="0.01"
            error={errors.saldoInicialCartao?.message}
            {...register('saldoInicialCartao')}
          />
          <Input
            label="Pix (R$)"
            type="number"
            step="0.01"
            error={errors.saldoInicialPix?.message}
            {...register('saldoInicialPix')}
          />
          <Input
            label="Transferência (R$)"
            type="number"
            step="0.01"
            error={errors.saldoInicialTransferencia?.message}
            {...register('saldoInicialTransferencia')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={fechar} disabled={abrir.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={abrir.isPending}>
            Abrir caixa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
