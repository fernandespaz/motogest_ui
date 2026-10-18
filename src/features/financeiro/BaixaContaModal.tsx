import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { formatCurrency } from '@/lib/formatters';
import type { BaixaContaRequest, FormaPagamento } from '@/api/types';
import type { TipoConta } from './ContaFormModal';

const hojeIso = () => format(new Date(), 'yyyy-MM-dd');

const schema = z.object({
  data: z.string().min(1, 'Informe a data').refine((d) => d <= hojeIso(), 'A data não pode ser futura'),
  formaPagamento: z.string().optional(),
  valorEfetivo: z.coerce.number({ invalid_type_error: 'Informe um valor válido' }).positive('Informe um valor válido'),
});

type FormValues = z.infer<typeof schema>;

const TEXTOS = {
  pagar: { titulo: 'Registrar pagamento', verbo: 'Pagar', data: 'Data do pagamento', valor: 'Valor pago (R$)' },
  receber: { titulo: 'Registrar recebimento', verbo: 'Receber', data: 'Data do recebimento', valor: 'Valor recebido (R$)' },
} as const;

/**
 * Baixa de uma conta: a data real (pode ser retroativa), a forma de pagamento e o valor efetivo — que pode
 * diferir do valor da conta (juros e multa, ou desconto). Tudo opcional no backend; aqui já vem preenchido
 * com hoje e o valor da conta, então o caso comum continua sendo um clique.
 */
export function BaixaContaModal({
  tipo,
  conta,
  loading,
  onConfirm,
  onClose,
}: {
  tipo: TipoConta;
  conta: { descricao: string; valor: number } | null;
  loading?: boolean;
  onConfirm: (baixa: BaixaContaRequest) => void;
  onClose: () => void;
}) {
  const textos = TEXTOS[tipo];
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // depende dos valores, não da identidade do objeto: o pai recria `conta` a cada render e isso apagaria o que o usuário digitou
  const aberta = !!conta;
  const valorConta = conta?.valor;
  useEffect(() => {
    if (aberta) reset({ data: hojeIso(), formaPagamento: '', valorEfetivo: valorConta });
  }, [aberta, valorConta, reset]);

  const valorEfetivo = Number(watch('valorEfetivo'));
  const diferenca = conta && Number.isFinite(valorEfetivo) ? Math.round((valorEfetivo - conta.valor) * 100) / 100 : 0;

  const FORM_ID = `baixa-${tipo}-form`;

  return (
    <Modal
      open={!!conta}
      onClose={onClose}
      title={textos.titulo}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={loading}>
            {textos.verbo}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit((v) =>
          onConfirm({
            data: v.data,
            formaPagamento: (v.formaPagamento || undefined) as FormaPagamento | undefined,
            valorEfetivo: v.valorEfetivo,
          }),
        )}
      >
        <div className="rounded-xl bg-surface-alt px-4 py-3 sm:col-span-2">
          <p className="text-sm font-medium text-ink">{conta?.descricao}</p>
          <p className="text-sm text-ink-muted">Valor da conta: {formatCurrency(conta?.valor)}</p>
        </div>

        <Input label={textos.data} type="date" required max={hojeIso()} error={errors.data?.message} {...register('data')} />
        <Select label="Forma de pagamento" {...register('formaPagamento')}>
          <option value="">Não informar</option>
          {FORMAS_PAGAMENTO.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <Input
            label={textos.valor}
            type="number"
            step="0.01"
            required
            error={errors.valorEfetivo?.message}
            hint={
              diferenca > 0
                ? `${formatCurrency(diferenca)} acima do valor da conta (juros ou multa)`
                : diferenca < 0
                  ? `${formatCurrency(Math.abs(diferenca))} abaixo do valor da conta (desconto)`
                  : undefined
            }
            {...register('valorEfetivo')}
          />
        </div>
      </form>
    </Modal>
  );
}
