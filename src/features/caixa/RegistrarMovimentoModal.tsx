import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useRegistrarCaixa } from '@/hooks/useFinanceiro';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaTipo } from '@/api/types';

const schema = z.object({
  categoria: z.enum(['VENDA_OS', 'PAGAMENTO_CONTA', 'RECEBIMENTO_CONTA', 'OUTRO']),
  valor: z.coerce.number().positive('Informe um valor válido'),
  formaPagamento: z.enum(['DINHEIRO', 'CARTAO', 'PIX', 'TRANSFERENCIA']),
  descricao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/** `tipo` vem fixado por qual botão (Entrada/Saída) abriu o modal — não é um campo editável aqui, ver MeuCaixaPage. */
export function RegistrarMovimentoModal({
  open,
  tipo,
  onClose,
}: {
  open: boolean;
  tipo: CaixaTipo;
  onClose: () => void;
}) {
  const registrar = useRegistrarCaixa();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoria: 'OUTRO', formaPagamento: 'DINHEIRO', descricao: '' },
  });

  useEffect(() => {
    if (open) reset({ categoria: 'OUTRO', formaPagamento: 'DINHEIRO', valor: undefined, descricao: '' });
  }, [open, reset]);

  function fechar() {
    onClose();
  }

  async function onSubmit(values: FormValues) {
    try {
      await registrar.mutateAsync({ ...values, tipo });
      toast.success(tipo === 'ENTRADA' ? 'Entrada registrada.' : 'Saída registrada.');
      fechar();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar o lançamento.'));
    }
  }

  return (
    <Modal open={open} onClose={fechar} title={tipo === 'ENTRADA' ? 'Nova entrada' : 'Nova saída'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Select label="Categoria" {...register('categoria')}>
          <option value="VENDA_OS">Venda de OS</option>
          <option value="PAGAMENTO_CONTA">Pagamento de conta</option>
          <option value="RECEBIMENTO_CONTA">Recebimento de conta</option>
          <option value="OUTRO">Outro</option>
        </Select>
        <Select label="Forma de pagamento" {...register('formaPagamento')}>
          {FORMAS_PAGAMENTO.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="Valor (R$)" type="number" step="0.01" required error={errors.valor?.message} {...register('valor')} />
        <Textarea label="Descrição" {...register('descricao')} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={fechar} disabled={registrar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant={tipo === 'ENTRADA' ? 'success' : 'danger'} loading={registrar.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
