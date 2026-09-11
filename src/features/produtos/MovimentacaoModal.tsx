import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useRegistrarMovimentacao } from '@/hooks/useEstoque';
import type { ProdutoResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA', 'RESERVA', 'LIBERACAO_RESERVA', 'AJUSTE']),
  quantidade: z.coerce.number({ invalid_type_error: 'Informe a quantidade' }).positive('Informe uma quantidade positiva'),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const tipoLabels: Record<FormValues['tipo'], string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  RESERVA: 'Reserva',
  LIBERACAO_RESERVA: 'Liberação de reserva',
  AJUSTE: 'Ajuste de inventário',
};

export function MovimentacaoModal({
  open,
  onClose,
  produto,
}: {
  open: boolean;
  onClose: () => void;
  produto: ProdutoResponse | null;
}) {
  const registrar = useRegistrarMovimentacao();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { tipo: 'ENTRADA' } });

  useEffect(() => {
    if (open) reset({ tipo: 'ENTRADA' });
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    if (!produto?.id) return;
    try {
      await registrar.mutateAsync({ produtoId: produto.id, payload: values });
      toast.success('Movimentação registrada.');
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar a movimentação.'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Movimentar estoque — ${produto?.nome ?? ''}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink-muted">
          Disponível: <span className="font-medium text-ink">{produto?.quantidadeDisponivel ?? 0}</span> · Reservado:{' '}
          <span className="font-medium text-ink">{produto?.quantidadeReservada ?? 0}</span>
        </p>
        <Select label="Tipo de movimentação" required {...register('tipo')}>
          {Object.entries(tipoLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="Quantidade" type="number" step="0.01" required error={errors.quantidade?.message} {...register('quantidade')} />
        <Textarea label="Observação" {...register('observacao')} />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={registrar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={registrar.isPending}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
