import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useConcluirCadastroOrcamento } from '@/hooks/useOrcamentos';
import { useVeiculosDoCliente } from '@/hooks/useClientes';
import { formatCnpj, formatCpf, formatPhone, onlyDigits } from '@/lib/formatters';
import { extractErrorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { OrcamentoResponse } from '@/api/types';
import { VeiculoCampos } from '@/features/shared/VeiculoCampos';
import { SugestoesClienteExistente } from './ClienteOrcamentoModo';
import { conclusaoInicial, montarConclusao, type ConclusaoValues } from './orcamentoModo';

const NOVO_VEICULO = '';

/**
 * Transforma o rascunho "ainda não cadastrado" em um orçamento com cliente e veículo de verdade, num passo só:
 * o que o consultor já digitou vem preenchido e ele completa o que falta (documento, categoria…). Os itens não mudam.
 */
export function ConcluirCadastroModal({
  open,
  onClose,
  orcamento,
  onConcluido,
}: {
  open: boolean;
  onClose: () => void;
  orcamento: OrcamentoResponse;
  onConcluido?: (orcamento: OrcamentoResponse) => void;
}) {
  const mutation = useConcluirCadastroOrcamento();
  // Rascunho que já tem cliente (só faltava o veículo) não pede os dados do cliente de novo.
  const clienteJaVinculado = orcamento.clienteId != null;
  const [clienteExistente, setClienteExistente] = useState<{ id: number; nome: string } | null>(null);
  const [veiculoExistenteId, setVeiculoExistenteId] = useState<string>(NOVO_VEICULO);
  // Listar os veículos do cliente é um GET de cliente (CLIENTE_READ): sem essa permissão, só cadastra veículo novo.
  const podeLerClientes = useAuthStore((s) => s.hasPermission)('CLIENTE_READ');
  const clienteParaVeiculos = podeLerClientes ? (clienteJaVinculado ? orcamento.clienteId : clienteExistente?.id) : undefined;
  const { data: veiculosDoCliente } = useVeiculosDoCliente(clienteParaVeiculos ?? undefined);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ConclusaoValues>({ defaultValues: conclusaoInicial(orcamento) });

  useEffect(() => {
    if (!open) return;
    reset(conclusaoInicial(orcamento));
    setClienteExistente(null);
    setVeiculoExistenteId(NOVO_VEICULO);
    // Reabrir parte sempre do que está salvo no rascunho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orcamento.id]);

  const tipoPessoa = watch('tipoPessoa');
  const telefone = watch('telefone');
  const email = watch('email');
  const usandoVeiculoExistente = veiculoExistenteId !== NOVO_VEICULO;
  const mostrarCliente = !clienteJaVinculado && !clienteExistente;

  async function onSubmit(values: ConclusaoValues) {
    const resultado = montarConclusao(values, {
      clienteId: clienteExistente?.id,
      clienteJaVinculado,
      veiculoId: usandoVeiculoExistente ? Number(veiculoExistenteId) : undefined,
    });
    if ('erros' in resultado) {
      for (const [campo, message] of Object.entries(resultado.erros)) {
        setError(campo as keyof ConclusaoValues, { message });
      }
      return;
    }
    try {
      const atualizado = await mutation.mutateAsync({ id: orcamento.id!, payload: resultado.payload });
      toast.success('Cadastro concluído. O orçamento já pode ser enviado.');
      onConcluido?.(atualizado);
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível concluir o cadastro.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Concluir cadastro"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="concluir-cadastro-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Concluir cadastro'}
          </Button>
        </div>
      }
    >
      <form id="concluir-cadastro-form" onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <p className="text-sm text-ink-muted">
          Cria o cliente e o veículo e vincula ao orçamento. Os itens e valores continuam como estão.
        </p>

        <section className="flex flex-col gap-3" aria-label="Cliente">
          <h3 className="text-sm font-semibold text-ink">Cliente</h3>
          {clienteJaVinculado && <p className="text-sm text-ink">{orcamento.clienteNome}</p>}
          {clienteExistente && (
            <div className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-sm">
              <span className="text-ink">
                Usando o cadastro de <strong>{clienteExistente.nome}</strong>
              </span>
              <button
                type="button"
                className="font-medium text-brand-600 hover:underline"
                onClick={() => {
                  setClienteExistente(null);
                  setVeiculoExistenteId(NOVO_VEICULO);
                }}
              >
                Cadastrar como novo
              </button>
            </div>
          )}
          {mostrarCliente && (
            <>
              <SugestoesClienteExistente
                telefone={telefone}
                email={email}
                onEscolher={(id, nome) => {
                  setClienteExistente({ id, nome });
                  setVeiculoExistenteId(NOVO_VEICULO);
                }}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select label="Tipo de pessoa" {...register('tipoPessoa')}>
                  <option value="PF">Pessoa física</option>
                  <option value="PJ">Pessoa jurídica</option>
                </Select>
                <Controller
                  control={control}
                  name="documento"
                  render={({ field }) => (
                    <Input
                      label={tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      value={tipoPessoa === 'PJ' ? formatCnpj(field.value) : formatCpf(field.value)}
                      onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, tipoPessoa === 'PJ' ? 14 : 11))}
                      error={errors.documento?.message}
                    />
                  )}
                />
                <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
                <Controller
                  control={control}
                  name="telefone"
                  render={({ field }) => (
                    <Input
                      label="Telefone / WhatsApp"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      value={formatPhone(field.value)}
                      onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 11))}
                    />
                  )}
                />
                <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
              </div>
            </>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-label="Veículo">
          <h3 className="text-sm font-semibold text-ink">Veículo</h3>
          {clienteParaVeiculos != null && (veiculosDoCliente?.length ?? 0) > 0 && (
            <Select
              label="Veículo do cliente"
              value={veiculoExistenteId}
              onChange={(e) => setVeiculoExistenteId(e.target.value)}
            >
              <option value={NOVO_VEICULO}>Cadastrar veículo novo</option>
              {veiculosDoCliente?.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.placa} — {`${v.marca ?? ''} ${v.modelo ?? ''}`.trim() || 'sem descrição'}
                </option>
              ))}
            </Select>
          )}
          {/* Os mesmos campos do cadastro de veículo (inclusive a busca por placa, que só completa o que está vazio). */}
          {!usandoVeiculoExistente && (
            <VeiculoCampos
              register={register}
              watch={watch}
              setValue={setValue}
              errors={{ placa: errors.placa, categoria: errors.categoria }}
              categoriaVazia
              consultaPlaca
            />
          )}
        </section>
      </form>
    </Modal>
  );
}
