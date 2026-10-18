import { useEffect } from 'react';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import { useCategoriasFinanceiras } from '@/hooks/useFinanceiro';
import { useAuthStore } from '@/store/authStore';
import { useRegistrarMovimentacao } from '@/hooks/useEstoque';
import type { ProdutoResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'movimentacao-form';

const schema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA', 'RESERVA', 'LIBERACAO_RESERVA', 'AJUSTE']),
  quantidade: z.coerce.number({ invalid_type_error: 'Informe a quantidade' }).positive('Informe uma quantidade positiva'),
  observacao: z.string().optional(),
  // compra: só vale para ENTRADA e é conferido no envio (ver onSubmit)
  gerarConta: z.boolean().optional(),
  fornecedor: z.string().optional(),
  valorCompra: z.union([z.coerce.number(), z.literal('')]).optional(),
  vencimento: z.string().optional(),
  documento: z.string().optional(),
  categoriaId: z.string().optional(),
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
  const podeLancarConta = useAuthStore((s) => s.hasPermission('FINANCEIRO_WRITE'));
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { tipo: 'ENTRADA' } });

  useEffect(() => {
    if (open) reset({ tipo: 'ENTRADA', gerarConta: false });
  }, [open, reset]);

  const gerandoConta = podeLancarConta && watch('tipo') === 'ENTRADA' && !!watch('gerarConta');

  async function onSubmit(values: FormValues) {
    if (!produto?.id) return;
    const { gerarConta, fornecedor, valorCompra, vencimento, documento, categoriaId, ...movimentacao } = values;
    let contaPagar;
    if (gerandoConta && gerarConta) {
      const valor = Number(valorCompra);
      let invalido = false;
      if (!fornecedor?.trim()) {
        setError('fornecedor', { message: 'Informe o fornecedor' });
        invalido = true;
      }
      if (!(valor > 0)) {
        setError('valorCompra', { message: 'Informe o valor da compra' });
        invalido = true;
      }
      if (!vencimento) {
        setError('vencimento', { message: 'Informe o vencimento' });
        invalido = true;
      }
      if (invalido) return;
      contaPagar = {
        fornecedor: fornecedor!.trim(),
        valor,
        dataVencimento: vencimento!,
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        documento: documento?.trim() || undefined,
      };
    }
    try {
      await registrar.mutateAsync({ produtoId: produto.id, payload: { ...movimentacao, contaPagar } });
      toast.success(contaPagar ? 'Entrada registrada e conta a pagar criada.' : 'Movimentação registrada.');
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar a movimentação.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Movimentar estoque — ${produto?.nome ?? ''}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={registrar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={registrar.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
        {podeLancarConta && watch('tipo') === 'ENTRADA' && (
          <CompraCampos aberto={gerandoConta} register={register} errors={errors} />
        )}
      </form>
    </Modal>
  );
}

/** Entrada de mercadoria comprada: opcionalmente já lança a conta a pagar (fornecedor, valor, vencimento) no Financeiro. */
function CompraCampos({
  aberto,
  register,
  errors,
}: {
  aberto: boolean;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-alt/50 p-4">
      <Checkbox label="Gerar a conta a pagar desta compra" {...register('gerarConta')} />
      {aberto && <CompraDetalhes register={register} errors={errors} />}
    </div>
  );
}

function CompraDetalhes({ register, errors }: { register: UseFormRegister<FormValues>; errors: FieldErrors<FormValues> }) {
  const { data: categorias } = useCategoriasFinanceiras({ tipo: 'DESPESA' });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Input label="Fornecedor" required error={errors.fornecedor?.message} {...register('fornecedor')} />
      <Input label="Valor total da compra (R$)" type="number" step="0.01" required error={errors.valorCompra?.message} {...register('valorCompra')} />
      <Input label="Vencimento" type="date" required error={errors.vencimento?.message} {...register('vencimento')} />
      <Input label="Nº da nota (opcional)" {...register('documento')} />
      <div className="sm:col-span-2">
        <Select label="Categoria" {...register('categoriaId')}>
          <option value="">Padrão (Peças e insumos)</option>
          {(categorias ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
