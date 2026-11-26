import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { useFecharCaixaSessao } from '@/hooks/useFinanceiro';
import { caixaApi } from '@/api/endpoints/caixa';
import { useExportacaoCaixa } from '@/features/financeiro/useExportacaoCaixa';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaSessaoResponse } from '@/api/types';

// Tolerância pra arredondamento de ponto flutuante — não é "regra de negócio", é
// só evitar que 120.00 vs 119.999999998 acuse divergência por erro de precisão.
const EPSILON = 0.005;

const FORMAS = [
  { campo: 'saldoFinalInformadoDinheiro', chave: 'dinheiro', label: 'Dinheiro' },
  { campo: 'saldoFinalInformadoCartao', chave: 'cartao', label: 'Cartão' },
  { campo: 'saldoFinalInformadoPix', chave: 'pix', label: 'Pix' },
  { campo: 'saldoFinalInformadoTransferencia', chave: 'transferencia', label: 'Transferência' },
] as const;

type CampoContado = (typeof FORMAS)[number]['campo'];

// Campo em branco NÃO é zero: contar "0" é uma afirmação ("não há nada aqui"), então exige digitar.
const valorContado = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce
    .number({ required_error: 'Informe o valor contado', invalid_type_error: 'Informe o valor contado' })
    .min(0, 'Informe um valor válido'),
);

function buildSchema(saldoAtual: CaixaSessaoResponse['saldoAtual']) {
  return z
    .object({
      saldoFinalInformadoDinheiro: valorContado,
      saldoFinalInformadoCartao: valorContado,
      saldoFinalInformadoPix: valorContado,
      saldoFinalInformadoTransferencia: valorContado,
      observacao: z.string().optional(),
      justificativaDivergencia: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const divergiu = FORMAS.some(
        (f) => Math.abs(data[f.campo] - (saldoAtual?.[f.chave] ?? 0)) > EPSILON,
      );
      if (divergiu && !data.justificativaDivergencia?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['justificativaDivergencia'],
          message: 'O valor informado diverge do saldo calculado pelo sistema — justifique a divergência.',
        });
      }
    });
}

type FormInput = z.input<ReturnType<typeof buildSchema>>;
type FormValues = z.output<ReturnType<typeof buildSchema>>;

type Passo = 'contagem' | 'revisao' | 'concluido';

function textoDiferenca(diferenca: number) {
  if (Math.abs(diferenca) <= EPSILON) return 'Confere';
  return `${diferenca > 0 ? 'Sobrou' : 'Faltou'} ${formatCurrency(Math.abs(diferenca))}`;
}

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
  const [passo, setPasso] = useState<Passo>('contagem');
  // Ao trocar de passo o botão focado some do DOM: leva o foco (e a leitura do leitor de tela) ao texto do novo passo.
  const introRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    introRef.current?.focus();
  }, [passo]);
  // Depois de fechar, a página deixa de ter sessão aberta: guarda o que o comprovante precisa.
  const [fechada, setFechada] = useState<{ id: number; identificador?: string } | null>(null);
  const { exportando, exportar } = useExportacaoCaixa('Não foi possível gerar o comprovante.');

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormInput, unknown, FormValues> });

  useEffect(() => {
    if (!open) return;
    setPasso('contagem');
    setFechada(null);
    // Contagem cega: começa tudo vazio — pré-preencher com o saldo do sistema transformaria a conferência em "OK".
    reset({
      saldoFinalInformadoDinheiro: '',
      saldoFinalInformadoCartao: '',
      saldoFinalInformadoPix: '',
      saldoFinalInformadoTransferencia: '',
      observacao: '',
      justificativaDivergencia: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reseta ao abrir, não a cada dígito digitado
  }, [open]);

  // Reavalia a cada digitação na revisão (as diferenças aparecem ali, nunca durante a contagem).
  watch();
  const contados = FORMAS.map((f) => {
    const bruto = getValues(f.campo);
    return { ...f, contado: Number(bruto ?? 0), calculado: saldoAtual?.[f.chave] ?? 0 };
  });
  const totalContado = contados.reduce((s, c) => s + c.contado, 0);
  const totalCalculado = contados.reduce((s, c) => s + c.calculado, 0);
  const diferencaTotal = totalContado - totalCalculado;
  const temDivergencia = contados.some((c) => Math.abs(c.contado - c.calculado) > EPSILON);

  async function conferir() {
    const ok = await trigger(FORMAS.map((f) => f.campo) as CampoContado[]);
    if (ok) setPasso('revisao');
  }

  async function onSubmit(values: FormValues) {
    if (!sessao?.id) {
      toast.error('Este caixa não está mais aberto. Atualize a página.');
      return;
    }
    // O campo de justificativa some quando não há divergência, mas o form guarda o texto digitado antes de o
    // usuário corrigir a contagem: não pode seguir para o fechamento de um caixa que bate.
    const divergiu = FORMAS.some((f) => Math.abs(values[f.campo] - (saldoAtual?.[f.chave] ?? 0)) > EPSILON);
    const payload = { ...values, justificativaDivergencia: divergiu ? values.justificativaDivergencia : '' };
    try {
      await fecharSessao.mutateAsync({ id: sessao.id, payload });
      toast.success('Caixa fechado.');
      setFechada({ id: sessao.id, identificador: sessao.identificador });
      setPasso('concluido');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível fechar o caixa.'));
    }
  }

  async function baixarComprovante() {
    if (!fechada) return;
    await exportar(() => caixaApi.sessoes.exportar(fechada.id, 'PDF'), `caixa-${fechada.identificador ?? fechada.id}`, 'PDF');
  }

  const titulo = passo === 'concluido' ? 'Caixa fechado' : 'Fechar caixa';

  return (
    <Modal open={open} onClose={onClose} title={titulo} size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (passo === 'contagem') void conferir();
          else if (passo === 'revisao') void handleSubmit(onSubmit)(e);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        {passo === 'contagem' && (
          <>
            <p ref={introRef} tabIndex={-1} className="text-xs text-ink-muted outline-none">
              Passo 1 de 2 — conte o que há em cada forma de pagamento e informe os valores. O saldo calculado pelo
              sistema só aparece no próximo passo, para a conferência ser honesta.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FORMAS.map((f) => (
                <CampoContagem
                  key={f.campo}
                  label={f.label}
                  error={errors[f.campo]?.message}
                  registration={register(f.campo)}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Conferir</Button>
            </div>
          </>
        )}

        {passo === 'revisao' && (
          <>
            <p ref={introRef} tabIndex={-1} className="text-xs text-ink-muted outline-none">
              Passo 2 de 2 — compare o que você contou com o saldo calculado (saldo inicial + entradas − saídas do
              turno).
            </p>
            <table className="w-full text-sm">
              <caption className="sr-only">Conferência do caixa por forma de pagamento</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="py-1 font-medium">Forma</th>
                  <th scope="col" className="py-1 text-right font-medium">Calculado</th>
                  <th scope="col" className="py-1 text-right font-medium">Contado</th>
                  <th scope="col" className="py-1 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {contados.map((c) => {
                  const dif = c.contado - c.calculado;
                  const diverge = Math.abs(dif) > EPSILON;
                  return (
                    <tr key={c.campo} className="border-t border-border">
                      <th scope="row" className="py-1.5 text-left font-normal">{c.label}</th>
                      <td className="py-1.5 text-right">{formatCurrency(c.calculado)}</td>
                      <td className="py-1.5 text-right">{formatCurrency(c.contado)}</td>
                      <td className={`py-1.5 text-right font-medium ${diverge ? 'text-danger' : 'text-success'}`}>
                        {textoDiferenca(dif)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border font-semibold">
                  <th scope="row" className="py-1.5 text-left">Total</th>
                  <td className="py-1.5 text-right">{formatCurrency(totalCalculado)}</td>
                  <td className="py-1.5 text-right">{formatCurrency(totalContado)}</td>
                  <td className={`py-1.5 text-right ${temDivergencia ? 'text-danger' : 'text-success'}`}>
                    {textoDiferenca(diferencaTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            <Textarea label="Observação" {...register('observacao')} />
            {temDivergencia && (
              <Textarea
                label="Justificativa da divergência"
                required
                error={errors.justificativaDivergencia?.message}
                {...register('justificativaDivergencia')}
              />
            )}

            <div className="flex justify-between gap-2">
              <Button type="button" variant="secondary" onClick={() => setPasso('contagem')} disabled={fecharSessao.isPending}>
                Voltar à contagem
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={fecharSessao.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" variant="danger" loading={fecharSessao.isPending}>
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          </>
        )}

        {passo === 'concluido' && (
          <>
            <p ref={introRef} tabIndex={-1} className="text-sm outline-none">
              O caixa{fechada?.identificador ? ` ${fechada.identificador}` : ''} foi fechado. Guarde o comprovante do
              fechamento.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={baixarComprovante} loading={exportando}>
                Baixar comprovante (PDF)
              </Button>
              <Button type="button" onClick={onClose}>
                Concluir
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

function CampoContagem({
  label,
  error,
  registration,
}: {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return <Input label={`${label} (R$)`} type="number" step="0.01" min="0" error={error} {...registration} />;
}
