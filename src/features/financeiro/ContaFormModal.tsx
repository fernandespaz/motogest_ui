import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  useCategoriasFinanceiras,
  useCreateContaPagar,
  useCreateContaReceber,
  useCriarContasPagarEmLote,
  useCriarContasReceberEmLote,
  useUpdateContaPagar,
  useUpdateContaReceber,
} from '@/hooks/useFinanceiro';
import { useClientes } from '@/hooks/useClientes';
import { formatCpfOuCnpj, formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CategoriaFinanceiraResponse, ContaPagarResponse, ContaReceberResponse } from '@/api/types';
import { previaDoLote, type TipoRepeticao } from './contasUtils';

export type TipoConta = 'pagar' | 'receber';
export type ContaEditavel = ContaPagarResponse | ContaReceberResponse;

type Repeticao = 'UNICA' | TipoRepeticao;

const schema = z.object({
  descricao: z.string().min(1, 'Informe a descrição'),
  categoriaId: z.coerce.number({ invalid_type_error: 'Selecione a categoria' }).positive('Selecione a categoria'),
  fornecedor: z.string().optional(),
  clienteId: z.coerce.number().optional(),
  valor: z.coerce.number({ invalid_type_error: 'Informe um valor válido' }).positive('Informe um valor válido'),
  dataVencimento: z.string().min(1, 'Informe o vencimento'),
  documento: z.string().max(60, 'No máximo 60 caracteres').optional(),
  observacao: z.string().max(500, 'No máximo 500 caracteres').optional(),
  quantidade: z.coerce.number().int().min(2, 'Mínimo de 2').max(60, 'Máximo de 60').optional(),
});

type FormValues = z.infer<typeof schema>;

const VAZIO: FormValues = {
  descricao: '',
  categoriaId: 0,
  fornecedor: '',
  clienteId: 0,
  valor: undefined as unknown as number,
  dataVencimento: '',
  documento: '',
  observacao: '',
  quantidade: 3,
};

/** Cadastro e edição de uma conta — a pagar (com fornecedor) ou a receber (com cliente), no mesmo formulário. */
export function ContaFormModal({
  tipo,
  conta,
  open,
  onClose,
}: {
  tipo: TipoConta;
  /** Quando presente, é uma edição. */
  conta?: ContaEditavel | null;
  open: boolean;
  onClose: () => void;
}) {
  const isEditing = !!conta;
  const [buscaCliente, setBuscaCliente] = useState('');
  const [repeticao, setRepeticao] = useState<Repeticao>('UNICA');
  const criarPagar = useCreateContaPagar();
  const criarReceber = useCreateContaReceber();
  const lotePagar = useCriarContasPagarEmLote();
  const loteReceber = useCriarContasReceberEmLote();
  const atualizarPagar = useUpdateContaPagar();
  const atualizarReceber = useUpdateContaReceber();
  const tipoCategoria = tipo === 'pagar' ? 'DESPESA' : 'RECEITA';
  const { data: categorias } = useCategoriasFinanceiras({ tipo: tipoCategoria }, { enabled: open });
  const { data: clientes, isFetching: buscandoClientes } = useClientes(
    { size: 50, nome: buscaCliente || undefined },
    { enabled: open && tipo === 'receber' },
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: VAZIO });

  useEffect(() => {
    if (!open) return;
    setBuscaCliente('');
    setRepeticao('UNICA');
    if (!conta) return reset(VAZIO);
    const receber = conta as ContaReceberResponse;
    const pagar = conta as ContaPagarResponse;
    reset({
      descricao: conta.descricao ?? '',
      categoriaId: conta.categoriaId ?? 0,
      fornecedor: tipo === 'pagar' ? (pagar.fornecedor ?? '') : '',
      clienteId: tipo === 'receber' ? (receber.clienteId ?? 0) : 0,
      valor: conta.valor ?? (undefined as unknown as number),
      dataVencimento: conta.dataVencimento ?? '',
      documento: conta.documento ?? '',
      observacao: conta.observacao ?? '',
      quantidade: 3,
    });
  }, [open, conta, tipo, reset]);

  // A categoria atual da conta entra na lista mesmo se foi desativada depois — senão o select a perderia.
  const opcoesCategoria = useMemo<CategoriaFinanceiraResponse[]>(() => {
    const lista = categorias ?? [];
    if (conta?.categoriaId && !lista.some((c) => c.id === conta.categoriaId)) {
      return [
        ...lista,
        { id: conta.categoriaId, nome: conta.categoriaNome ?? 'Categoria', tipo: tipoCategoria, fixa: false, ativo: false },
      ];
    }
    return lista;
  }, [categorias, conta, tipoCategoria]);

  const valor = Number(watch('valor'));
  const dataVencimento = watch('dataVencimento');
  const quantidade = Number(watch('quantidade'));
  const previa = useMemo(
    () =>
      repeticao !== 'UNICA' && valor > 0 && dataVencimento && quantidade >= 2 && quantidade <= 60
        ? previaDoLote(valor, dataVencimento, repeticao, quantidade)
        : [],
    [repeticao, valor, dataVencimento, quantidade],
  );

  const salvando =
    criarPagar.isPending ||
    criarReceber.isPending ||
    lotePagar.isPending ||
    loteReceber.isPending ||
    atualizarPagar.isPending ||
    atualizarReceber.isPending;

  async function onSubmit(values: FormValues) {
    try {
      const base = {
        descricao: values.descricao,
        valor: values.valor,
        dataVencimento: values.dataVencimento,
        categoriaId: values.categoriaId,
        documento: values.documento || undefined,
        observacao: values.observacao || undefined,
      };
      let mensagem = isEditing ? 'Conta atualizada.' : tipo === 'pagar' ? 'Conta a pagar cadastrada.' : 'Conta a receber cadastrada.';

      if (tipo === 'pagar') {
        const payload = { ...base, fornecedor: values.fornecedor || undefined };
        if (conta?.id != null) await atualizarPagar.mutateAsync({ id: conta.id, payload });
        else if (repeticao !== 'UNICA') {
          const criadas = await lotePagar.mutateAsync({ conta: payload, repeticao: { tipo: repeticao, quantidade: values.quantidade! } });
          mensagem = `${criadas.length} contas a pagar cadastradas.`;
        } else await criarPagar.mutateAsync(payload);
      } else {
        const payload = {
          ...base,
          clienteId: values.clienteId || undefined,
          // Uma conta que veio do faturamento de uma OS mantém o vínculo ao ser editada.
          ordemServicoId: (conta as ContaReceberResponse | null | undefined)?.ordemServicoId,
        };
        if (conta?.id != null) await atualizarReceber.mutateAsync({ id: conta.id, payload });
        else if (repeticao !== 'UNICA') {
          const criadas = await loteReceber.mutateAsync({ conta: payload, repeticao: { tipo: repeticao, quantidade: values.quantidade! } });
          mensagem = `${criadas.length} contas a receber cadastradas.`;
        } else await criarReceber.mutateAsync(payload);
      }
      toast.success(mensagem);
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar a conta.'));
    }
  }

  const titulo = `${isEditing ? 'Editar' : 'Nova'} conta a ${tipo === 'pagar' ? 'pagar' : 'receber'}`;
  const FORM_ID = `conta-${tipo}-form`;
  const fixas = opcoesCategoria.filter((c) => c.fixa);
  const variaveis = opcoesCategoria.filter((c) => !c.fixa);
  const opcao = (c: CategoriaFinanceiraResponse) => (
    <option key={c.id} value={c.id}>
      {c.nome}
      {c.ativo === false ? ' (inativa)' : ''}
    </option>
  );
  const parcelaDaConta = conta?.parcelaTotal ? ` · parcela ${conta.parcelaNumero}/${conta.parcelaTotal}` : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo + parcelaDaConta}
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={salvando}>
            {previa.length > 1 ? `Cadastrar ${previa.length} contas` : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Input label="Descrição" required error={errors.descricao?.message} {...register('descricao')} />
        </div>

        <Select
          label="Categoria"
          required
          hint="Onde esse dinheiro é aplicado — é o que alimenta os relatórios"
          error={errors.categoriaId?.message}
          {...register('categoriaId')}
        >
          <option value={0}>Selecione a categoria</option>
          {tipo === 'pagar' ? (
            <>
              {fixas.length > 0 && <optgroup label="Despesas fixas">{fixas.map(opcao)}</optgroup>}
              {variaveis.length > 0 && <optgroup label="Despesas variáveis">{variaveis.map(opcao)}</optgroup>}
            </>
          ) : (
            opcoesCategoria.map(opcao)
          )}
        </Select>

        {tipo === 'pagar' ? (
          <Input label="Fornecedor" {...register('fornecedor')} />
        ) : (
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <Combobox
                label="Cliente"
                placeholder="Buscar cliente pelo nome..."
                value={field.value || undefined}
                onChange={(id) => field.onChange(id)}
                options={(clientes?.content ?? []).map((c) => ({
                  value: c.id!,
                  label: c.nome ?? '',
                  sublabel: c.documento ? formatCpfOuCnpj(c.documento) : undefined,
                }))}
                query={buscaCliente}
                onQueryChange={setBuscaCliente}
                loading={buscandoClientes}
              />
            )}
          />
        )}

        <Input
          label={repeticao === 'PARCELADO' ? 'Valor total (R$)' : 'Valor (R$)'}
          type="number"
          step="0.01"
          required
          error={errors.valor?.message}
          {...register('valor')}
        />
        <Input
          label={repeticao === 'UNICA' ? 'Vencimento' : 'Primeiro vencimento'}
          type="date"
          required
          error={errors.dataVencimento?.message}
          {...register('dataVencimento')}
        />

        {!isEditing && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-alt/50 p-4 sm:col-span-2">
            <SegmentedControl<Repeticao>
              label="Frequência"
              value={repeticao}
              onChange={setRepeticao}
              options={[
                { value: 'UNICA', label: 'Única vez' },
                { value: 'MENSAL', label: 'Repetir todo mês' },
                { value: 'PARCELADO', label: 'Parcelar' },
              ]}
            />
            {repeticao !== 'UNICA' && (
              <>
                <div className="max-w-[12rem]">
                  <Input
                    label={repeticao === 'MENSAL' ? 'Por quantos meses?' : 'Em quantas parcelas?'}
                    type="number"
                    min={2}
                    max={60}
                    error={errors.quantidade?.message}
                    {...register('quantidade')}
                  />
                </div>
                {previa.length > 0 && (
                  <p className="text-sm text-ink-muted" aria-live="polite">
                    {repeticao === 'MENSAL' ? (
                      <>
                        <strong className="text-ink">{previa.length} contas</strong> de {formatCurrency(previa[0].valor)}, de{' '}
                        {formatDate(previa[0].vencimento)} a {formatDate(previa[previa.length - 1].vencimento)}
                      </>
                    ) : (
                      <>
                        <strong className="text-ink">{previa.length} parcelas</strong>:{' '}
                        {formatCurrency(previa[0].valor)}
                        {previa[previa.length - 1].valor !== previa[0].valor && ` (a última de ${formatCurrency(previa[previa.length - 1].valor)})`}
                        , de {formatDate(previa[0].vencimento)} a {formatDate(previa[previa.length - 1].vencimento)}
                      </>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <Input label="Nº do documento" placeholder="Nota fiscal, boleto..." error={errors.documento?.message} {...register('documento')} />
        <div className="sm:col-span-2">
          <Textarea label="Observações" rows={2} error={errors.observacao?.message} {...register('observacao')} />
        </div>
      </form>
    </Modal>
  );
}
