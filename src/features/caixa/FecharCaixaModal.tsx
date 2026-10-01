import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { useFecharCaixaSessao } from '@/hooks/useFinanceiro';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaSessaoResponse } from '@/api/types';

// Tolerância pra arredondamento de ponto flutuante — não é "regra de negócio", é
// só evitar que 120.00 vs 119.999999998 acuse divergência por erro de precisão.
const EPSILON = 0.005;

function buildSchema(saldoAtual: CaixaSessaoResponse['saldoAtual']) {
  return z
    .object({
      saldoFinalInformadoDinheiro: z.coerce.number().min(0, 'Informe um valor válido'),
      saldoFinalInformadoCartao: z.coerce.number().min(0, 'Informe um valor válido'),
      saldoFinalInformadoPix: z.coerce.number().min(0, 'Informe um valor válido'),
      saldoFinalInformadoTransferencia: z.coerce.number().min(0, 'Informe um valor válido'),
      observacao: z.string().optional(),
      justificativaDivergencia: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const divergiu =
        Math.abs(data.saldoFinalInformadoDinheiro - (saldoAtual?.dinheiro ?? 0)) > EPSILON ||
        Math.abs(data.saldoFinalInformadoCartao - (saldoAtual?.cartao ?? 0)) > EPSILON ||
        Math.abs(data.saldoFinalInformadoPix - (saldoAtual?.pix ?? 0)) > EPSILON ||
        Math.abs(data.saldoFinalInformadoTransferencia - (saldoAtual?.transferencia ?? 0)) > EPSILON;
      if (divergiu && !data.justificativaDivergencia?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['justificativaDivergencia'],
          message: 'O valor informado diverge do saldo calculado pelo sistema — justifique a divergência.',
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function FecharCaixaModal({
  open,
  sessao,
  onClose,
}: {
  open: boolean;
  sessao: CaixaSessaoResponse | null | undefined;
  onClose: () => void;
}) {
  const fecharSessao = useFecharCaixaSessao();
  const saldoAtual = sessao?.saldoAtual;
  const schema = useMemo(() => buildSchema(saldoAtual), [saldoAtual]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      saldoFinalInformadoDinheiro: saldoAtual?.dinheiro ?? 0,
      saldoFinalInformadoCartao: saldoAtual?.cartao ?? 0,
      saldoFinalInformadoPix: saldoAtual?.pix ?? 0,
      saldoFinalInformadoTransferencia: saldoAtual?.transferencia ?? 0,
      observacao: '',
      justificativaDivergencia: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reseta ao abrir, não a cada dígito digitado
  }, [open]);

  const valores = watch();
  const divergenciaTotal =
    (valores.saldoFinalInformadoDinheiro ?? 0) -
    (saldoAtual?.dinheiro ?? 0) +
    ((valores.saldoFinalInformadoCartao ?? 0) - (saldoAtual?.cartao ?? 0)) +
    ((valores.saldoFinalInformadoPix ?? 0) - (saldoAtual?.pix ?? 0)) +
    ((valores.saldoFinalInformadoTransferencia ?? 0) - (saldoAtual?.transferencia ?? 0));
  const temDivergencia = Math.abs(divergenciaTotal) > EPSILON;

  function fechar() {
    onClose();
  }

  async function onSubmit(values: FormValues) {
    if (!sessao?.id) return;
    try {
      await fecharSessao.mutateAsync({ id: sessao.id, payload: values });
      toast.success('Caixa fechado.');
      fechar();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível fechar o caixa.'));
    }
  }

  return (
    <Modal open={open} onClose={fechar} title="Fechar caixa" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <p className="text-xs text-ink-muted">
          Confira o valor contado em cada forma de pagamento contra o saldo calculado pelo sistema.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <CampoConferencia
            label="Dinheiro"
            calculado={saldoAtual?.dinheiro}
            error={errors.saldoFinalInformadoDinheiro?.message}
            registration={register('saldoFinalInformadoDinheiro')}
          />
          <CampoConferencia
            label="Cartão"
            calculado={saldoAtual?.cartao}
            error={errors.saldoFinalInformadoCartao?.message}
            registration={register('saldoFinalInformadoCartao')}
          />
          <CampoConferencia
            label="Pix"
            calculado={saldoAtual?.pix}
            error={errors.saldoFinalInformadoPix?.message}
            registration={register('saldoFinalInformadoPix')}
          />
          <CampoConferencia
            label="Transferência"
            calculado={saldoAtual?.transferencia}
            error={errors.saldoFinalInformadoTransferencia?.message}
            registration={register('saldoFinalInformadoTransferencia')}
          />
        </div>

        <div
          className={
            temDivergencia
              ? 'rounded-lg border border-danger/40 bg-red-50 px-3 py-2 dark:bg-red-900/20'
              : 'rounded-lg border border-border bg-surface-alt px-3 py-2'
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Divergência total</p>
          <p className={temDivergencia ? 'text-base font-semibold text-danger' : 'text-base font-semibold text-success'}>
            {formatCurrency(divergenciaTotal)}
          </p>
        </div>

        <Textarea label="Observação" {...register('observacao')} />
        <Textarea
          label="Justificativa da divergência"
          required={temDivergencia}
          error={errors.justificativaDivergencia?.message}
          hint={temDivergencia ? undefined : 'Só é obrigatório quando há diferença entre o contado e o calculado.'}
          {...register('justificativaDivergencia')}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={fechar} disabled={fecharSessao.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={fecharSessao.isPending}>
            Fechar caixa
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CampoConferencia({
  label,
  calculado,
  error,
  registration,
}: {
  label: string;
  calculado: number | undefined;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Input label={`${label} (R$)`} type="number" step="0.01" error={error} {...registration} />
      <p className="text-xs text-ink-muted">Sistema: {formatCurrency(calculado ?? 0)}</p>
    </div>
  );
}
