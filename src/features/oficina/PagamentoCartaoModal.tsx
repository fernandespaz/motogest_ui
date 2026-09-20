import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { useIniciarAssinatura, useIniciarPedido } from '@/hooks/usePagamentos';
import { carregarPagBankSdk, criptografarCartao } from '@/lib/pagbankSdk';
import { formatCardExpiry, formatCardNumber, formatCnpj, formatCpf, formatCurrency, onlyDigits } from '@/lib/formatters';
import { pagamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { preventEnterSubmit } from '@/lib/preventEnterSubmit';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { PagamentoResponse } from '@/api/types';
import { PLANOS, type PlanoCodigo } from './pagamentoPlanos';
import { PlanoComparativoCards } from './PlanoComparativoCards';

const schema = z.object({
  plano: z.enum(['BASICO', 'PRO', 'PREMIUM']),
  tipoCobranca: z.enum(['ASSINATURA', 'PEDIDO']),
  titularNome: z.string().min(1, 'Informe o nome impresso no cartão'),
  titularCpfCnpj: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 11 || v.length === 14, 'Informe um CPF ou CNPJ válido'),
  numeroCartao: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 13 && v.length <= 19, 'Número do cartão inválido'),
  validade: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 4, 'Informe a validade no formato MM/AA'),
  cvv: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 3 || v.length === 4, 'CVV inválido'),
});

type FormValues = z.infer<typeof schema>;

const FORM_ID = 'pagamento-cartao-form';

export function PagamentoCartaoModal({
  open,
  onClose,
  planoInicial = 'PRO',
}: {
  open: boolean;
  onClose: () => void;
  planoInicial?: PlanoCodigo;
}) {
  const [criptografando, setCriptografando] = useState(false);
  const [resultado, setResultado] = useState<PagamentoResponse | null>(null);
  const iniciarPedido = useIniciarPedido();
  const iniciarAssinatura = useIniciarAssinatura();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plano: planoInicial, tipoCobranca: 'ASSINATURA' },
  });

  const planoSelecionado = watch('plano');
  const tipoCobranca = watch('tipoCobranca');
  const cpfCnpjAtual = watch('titularCpfCnpj') ?? '';
  const valorSelecionado =
    tipoCobranca === 'ASSINATURA' ? PLANOS[planoSelecionado].valorMensal : PLANOS[planoSelecionado].valorAvulso;

  function handleClose() {
    // O formulário some do DOM ao fechar, mas resetar explicitamente garante
    // que número do cartão e CVV não sobrevivam em memória entre uma tentativa
    // e outra (ex.: reabrir o modal para tentar outro plano).
    reset();
    setResultado(null);
    onClose();
  }

  function tentarNovamente() {
    // Uma cobrança RECUSADA/CANCELADA não é erro de transporte (a chamada
    // teve 200 de resposta) — volta ao formulário para o usuário corrigir os
    // dados, mas limpa os campos do cartão em si em vez de deixar o número e
    // o CVV recusados parados no estado por mais tempo do que o necessário.
    reset({ ...getValues(), numeroCartao: '', validade: '', cvv: '' });
    setResultado(null);
  }

  async function onSubmit(values: FormValues) {
    setCriptografando(true);
    let cardToken: string;
    try {
      await carregarPagBankSdk();
      cardToken = criptografarCartao({
        numero: values.numeroCartao,
        nomeTitular: values.titularNome,
        validadeMes: values.validade.slice(0, 2),
        validadeAno: `20${values.validade.slice(2, 4)}`,
        cvv: values.cvv,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível validar o cartão.');
      setCriptografando(false);
      return;
    }
    setCriptografando(false);

    try {
      const response =
        values.tipoCobranca === 'ASSINATURA'
          ? await iniciarAssinatura.mutateAsync({
              plano: values.plano,
              valorMensal: valorSelecionado,
              cardToken,
              // Diferente do pedido avulso: a API de Assinaturas do PagBank
              // exige o CVV em texto puro a cada cobrança, separado do
              // cardToken — regra PCI, CVV nunca pode ser tokenizado para
              // reuso (confirmado contra o /v3/api-docs ao vivo).
              cvv: values.cvv,
              titularNome: values.titularNome,
              titularCpfCnpj: values.titularCpfCnpj,
            })
          : await iniciarPedido.mutateAsync({
              plano: values.plano,
              valor: valorSelecionado,
              cardToken,
              titularNome: values.titularNome,
              titularCpfCnpj: values.titularCpfCnpj,
            });

      // Um HTTP 200 aqui não é sinônimo de "pago" — o PagBank pode recusar o
      // cartão e a API ainda assim responder 200 com status RECUSADO +
      // mensagemErro (ver PagamentoResponse no schema). Tratar qualquer
      // resposta 200 como sucesso fecharia o modal e mostraria "pagamento
      // enviado" para uma cobrança que na verdade falhou.
      setResultado(response);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível concluir o pagamento.'));
    }
  }

  const processando = criptografando || iniciarPedido.isPending || iniciarAssinatura.isPending;
  const foiRecusado = resultado?.status === 'RECUSADO' || resultado?.status === 'CANCELADO';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Pagamento seguro"
      size="lg"
      footer={
        resultado ? (
          foiRecusado ? (
            <>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={tentarNovamente}>
                Tentar novamente
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose}>
              Fechar
            </Button>
          )
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={processando}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} loading={processando}>
              Pagar {formatCurrency(valorSelecionado)}
            </Button>
          </>
        )
      }
    >
      {resultado ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Badge tone={metaFor(pagamentoStatusMeta, resultado.status).tone}>
            {metaFor(pagamentoStatusMeta, resultado.status).label}
          </Badge>
          <p className="text-sm text-ink">
            {resultado.status === 'PAGO' &&
              'Pagamento aprovado! Seu plano já foi atualizado.'}
            {resultado.status === 'PENDENTE' &&
              'Pagamento em processamento. Assim que o PagBank confirmar, seu plano é atualizado automaticamente.'}
            {foiRecusado &&
              (resultado.mensagemErro ?? 'O pagamento não foi aprovado. Confira os dados do cartão e tente novamente.')}
          </p>
        </div>
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} onKeyDown={preventEnterSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <span>
              Pagamento processado com segurança pelo PagBank. Os dados do seu cartão são criptografados no seu
              navegador e o MotoGest nunca chega a ver ou armazenar o número completo.
            </span>
          </div>

          {/* O plano é escolhido pelos cards acima, não por um <Select> — eles
              já cobrem seleção via teclado/clique e mostram o porquê de cada
              opção, então um segundo controle para o mesmo campo só duplicaria
              estado. `plano` continua no formulário via setValue/defaultValues,
              sem precisar de um input registrado. */}
          <PlanoComparativoCards
            selecionado={planoSelecionado}
            tipoCobranca={tipoCobranca}
            onSelecionar={(plano) => setValue('plano', plano, { shouldDirty: true })}
          />

          <Select label="Forma de cobrança" required {...register('tipoCobranca')}>
            <option value="ASSINATURA">Assinatura mensal (renovação automática)</option>
            <option value="PEDIDO">Pagamento único</option>
          </Select>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome no cartão"
              required
              autoComplete="cc-name"
              error={errors.titularNome?.message}
              {...register('titularNome')}
            />
            <Controller
              control={control}
              name="titularCpfCnpj"
              render={({ field }) => (
                <Input
                  label="CPF/CNPJ do titular"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  value={cpfCnpjAtual.length > 11 ? formatCnpj(cpfCnpjAtual) : formatCpf(cpfCnpjAtual)}
                  onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 14))}
                  error={errors.titularCpfCnpj?.message}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="numeroCartao"
            render={({ field }) => (
              <Input
                label="Número do cartão"
                required
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                value={formatCardNumber(field.value ?? '')}
                onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 19))}
                error={errors.numeroCartao?.message}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="validade"
              render={({ field }) => (
                <Input
                  label="Validade (MM/AA)"
                  required
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  value={formatCardExpiry(field.value ?? '')}
                  onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 4))}
                  error={errors.validade?.message}
                />
              )}
            />
            <Input
              label="CVV"
              required
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              error={errors.cvv?.message}
              {...register('cvv')}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
