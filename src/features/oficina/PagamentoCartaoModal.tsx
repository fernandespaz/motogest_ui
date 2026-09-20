import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Copy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useChavePublicaPagBank, useIniciarAssinatura, useIniciarPedido, useIniciarPix } from '@/hooks/usePagamentos';
import { carregarPagBankSdk, criptografarCartao } from '@/lib/pagbankSdk';
import { formatCardExpiry, formatCardNumber, formatCnpj, formatCpf, formatCurrency, onlyDigits } from '@/lib/formatters';
import { pagamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { preventEnterSubmit } from '@/lib/preventEnterSubmit';
import { toast } from '@/store/toastStore';
import { extractErrorMessage, mensagemSeguraParaUsuario } from '@/api/client';
import type { PagamentoResponse } from '@/api/types';
import { PLANOS, type PlanoCodigo } from './pagamentoPlanos';
import { PlanoComparativoCards } from './PlanoComparativoCards';

// Cartão (ASSINATURA/PEDIDO) exige nome/CPF-CNPJ/número/validade/CVV; Pix não
// exige nenhum dado de cartão — por isso esses campos ficam opcionais aqui e
// só viram obrigatórios via superRefine quando tipoCobranca !== 'PIX'.
const schema = z
  .object({
    plano: z.enum(['BASICO', 'PRO', 'PREMIUM']),
    tipoCobranca: z.enum(['ASSINATURA', 'PEDIDO', 'PIX']),
    titularNome: z.string().optional(),
    titularCpfCnpj: z.string().transform(onlyDigits).optional(),
    numeroCartao: z.string().transform(onlyDigits).optional(),
    validade: z.string().transform(onlyDigits).optional(),
    cvv: z.string().transform(onlyDigits).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipoCobranca === 'PIX') return;
    if (!data.titularNome?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['titularNome'], message: 'Informe o nome impresso no cartão' });
    }
    if (!data.titularCpfCnpj || (data.titularCpfCnpj.length !== 11 && data.titularCpfCnpj.length !== 14)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['titularCpfCnpj'], message: 'Informe um CPF ou CNPJ válido' });
    }
    if (!data.numeroCartao || data.numeroCartao.length < 13 || data.numeroCartao.length > 19) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['numeroCartao'], message: 'Número do cartão inválido' });
    }
    if (!data.validade || data.validade.length !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validade'], message: 'Informe a validade no formato MM/AA' });
    }
    if (!data.cvv || (data.cvv.length !== 3 && data.cvv.length !== 4)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cvv'], message: 'CVV inválido' });
    }
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
  // Cobre a chamada inteira de onSubmit (criptografia + rede) num único
  // estado local — não depende de `.isPending` dos hooks de mutation, que em
  // testes com hook mockado não reflete o tempo real da chamada em curso.
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<PagamentoResponse | null>(null);
  const iniciarPedido = useIniciarPedido();
  const iniciarAssinatura = useIniciarAssinatura();
  const iniciarPix = useIniciarPix();
  const {
    data: chavePublicaData,
    isLoading: carregandoChavePublica,
    isError: erroChavePublica,
  } = useChavePublicaPagBank();

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
    setProcessando(true);
    try {
      if (values.tipoCobranca === 'PIX') {
        try {
          const response = await iniciarPix.mutateAsync({ plano: values.plano, valor: valorSelecionado });
          setResultado(response);
        } catch (error) {
          toast.error(extractErrorMessage(error, 'Não foi possível gerar o Pix.'));
        }
        return;
      }

      // superRefine já garantiu que estes campos estão preenchidos e válidos
      // para qualquer tipoCobranca !== 'PIX' — os defaults só existem para o
      // TypeScript, que não enxerga essa garantia através do refine.
      const { titularNome = '', titularCpfCnpj = '', numeroCartao = '', validade = '', cvv = '' } = values;

      let cardToken: string;
      try {
        await carregarPagBankSdk();
        cardToken = criptografarCartao(chavePublicaData?.chavePublica ?? '', {
          numero: numeroCartao,
          nomeTitular: titularNome,
          validadeMes: validade.slice(0, 2),
          validadeAno: `20${validade.slice(2, 4)}`,
          cvv,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível validar o cartão.');
        return;
      }

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
                cvv,
                titularNome,
                titularCpfCnpj,
              })
            : await iniciarPedido.mutateAsync({
                plano: values.plano,
                valor: valorSelecionado,
                cardToken,
                titularNome,
                titularCpfCnpj,
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
    } finally {
      setProcessando(false);
    }
  }

  async function copiarPix(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Código Pix copiado.');
    } catch {
      // Falha silenciosa (ex.: permissão de clipboard negada) — o código
      // continua visível na tela para cópia manual, então isso é cosmético.
    }
  }

  const foiRecusado = resultado?.status === 'RECUSADO' || resultado?.status === 'CANCELADO';
  const ehPix = tipoCobranca === 'PIX';
  // Pix não usa o SDK do PagBank (não tem cartão pra criptografar), então só
  // trava/avisa sobre a chave pública quando ela de fato vai ser usada.
  const aguardandoChavePublica = !ehPix && carregandoChavePublica;
  const chavePublicaIndisponivel = !ehPix && erroChavePublica;

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
            <Button
              type="submit"
              form={FORM_ID}
              loading={processando}
              disabled={aguardandoChavePublica || chavePublicaIndisponivel}
            >
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

          {resultado.status === 'PENDENTE' && resultado.qrCodeImageUrl && (
            <img
              src={resultado.qrCodeImageUrl}
              alt="QR Code para pagamento via Pix"
              className="h-48 w-48 rounded-lg border border-border bg-white p-2"
            />
          )}

          {resultado.status === 'PENDENTE' && resultado.qrCodeText && (
            <div className="flex w-full flex-col gap-1 text-left">
              <p className="text-xs text-ink-muted">Pix copia e cola</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
                <code className="flex-1 truncate text-xs text-ink">{resultado.qrCodeText}</code>
                <button
                  type="button"
                  onClick={() => copiarPix(resultado.qrCodeText!)}
                  className="shrink-0 text-brand-600 hover:text-brand-700"
                  aria-label="Copiar código Pix"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-ink">
            {resultado.status === 'PAGO' && 'Pagamento aprovado! Seu plano já foi atualizado.'}
            {resultado.status === 'PENDENTE' &&
              (resultado.qrCodeText
                ? 'Escaneie o QR Code ou copie o código acima no app do seu banco. Assim que o pagamento for confirmado, seu plano é atualizado automaticamente.'
                : 'Pagamento em processamento. Assim que o PagBank confirmar, seu plano é atualizado automaticamente.')}
            {foiRecusado &&
              mensagemSeguraParaUsuario(
                resultado.mensagemErro,
                ehPix
                  ? 'O pagamento via Pix não foi aprovado. Tente novamente.'
                  : 'O pagamento não foi aprovado. Confira os dados do cartão e tente novamente.',
              )}
          </p>
        </div>
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} onKeyDown={preventEnterSubmit} className="flex flex-col gap-4" noValidate>
          {processando ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Spinner size={36} />
              <div>
                <p className="text-sm font-medium text-ink">
                  {ehPix ? 'Gerando seu Pix...' : 'Processando pagamento com segurança...'}
                </p>
                <p className="mt-1 text-xs text-ink-muted">Isso pode levar alguns segundos — não feche esta janela.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>
                  {ehPix
                    ? 'Pagamento processado com segurança pelo PagBank. Você paga direto pelo app do seu banco — nenhum dado de cartão é necessário.'
                    : 'Pagamento processado com segurança pelo PagBank. Os dados do seu cartão são criptografados no seu navegador e o MotoGest nunca chega a ver ou armazenar o número completo.'}
                </span>
              </div>

              {chavePublicaIndisponivel && (
                <p className="text-xs font-medium text-danger">
                  Pagamento por cartão temporariamente indisponível. Tente novamente em instantes ou use o Pix.
                </p>
              )}

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
                <option value="PEDIDO">Pagamento único (cartão)</option>
                <option value="PIX">Pix (pagamento único)</option>
              </Select>

              {!ehPix && (
                <>
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
                </>
              )}
            </>
          )}
        </form>
      )}
    </Modal>
  );
}
