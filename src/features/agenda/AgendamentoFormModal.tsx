import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, format } from 'date-fns';
import { MessageSquarePlus, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Combobox } from '@/components/ui/Combobox';
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal';
import { ServicoPicker } from '@/features/shared/ServicoPicker';
import { useCreateAgendamento, useUpdateAgendamento } from '@/hooks/useAgenda';
import { useClientes, useVeiculosDoCliente } from '@/hooks/useClientes';
import { useTodosServicos } from '@/hooks/useServicos';
import type { AgendamentoResponse, ClienteResponse, VeiculoResponse } from '@/api/types';
import { formatCpfOuCnpj, toDateTimeLocalValue } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const FORM_ID = 'agendamento-form';
const HORA_PADRAO = '08:00';

const schema = z.object({
  clienteId: z.coerce.number().positive('Selecione o cliente'),
  veiculoId: z.coerce.number().positive('Selecione o veículo'),
  dataHora: z.string().min(1, 'Informe a data e a hora'),
  observacoes: z.string().optional(),
  servicoIds: z.array(z.coerce.number()).min(1, 'Selecione ao menos um serviço'),
});

type FormValues = z.infer<typeof schema>;

const hojeIso = () => format(new Date(), 'yyyy-MM-dd');
const amanhaIso = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

export function AgendamentoFormModal({
  open,
  onClose,
  agendamento,
  defaultDate,
  onSalvoParaOrcamento,
}: {
  open: boolean;
  onClose: () => void;
  agendamento?: AgendamentoResponse | null;
  defaultDate?: string;
  /** Chamado com o id do agendamento recém-criado quando o usuário escolhe "Criar orçamento". */
  onSalvoParaOrcamento?: (agendamentoId: number) => void;
}) {
  const podeCriarOrcamento = useAuthStore((s) => s.hasPermission('ORCAMENTO_WRITE')) && !!onSalvoParaOrcamento;
  const podeCadastrarCliente = useAuthStore((s) => s.hasPermission('CLIENTE_WRITE'));
  const isEditing = !!agendamento;
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [clienteCriado, setClienteCriado] = useState<ClienteResponse | null>(null);
  const [observacaoAberta, setObservacaoAberta] = useState(false);
  const { data: clientes, isFetching: buscandoClientes } = useClientes({ size: 50, nome: buscaCliente || undefined });
  const createMutation = useCreateAgendamento();
  const updateMutation = useUpdateAgendamento();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { clienteId: 0, veiculoId: 0, servicoIds: [] } });

  const clienteId = watch('clienteId');
  const veiculoId = watch('veiculoId');
  const dataHora = watch('dataHora') ?? '';
  const observacoes = watch('observacoes');
  const { data: veiculos } = useVeiculosDoCliente(clienteId || undefined);
  const { data: catalogo, isLoading: carregandoServicos } = useTodosServicos();
  const servicosAtivos = useMemo(() => (catalogo ?? []).filter((s) => s.ativo !== false), [catalogo]);

  const veiculoSelecionado = useMemo(() => veiculos?.find((v) => v.id === veiculoId), [veiculos, veiculoId]);
  const categoriaVeiculo = veiculoSelecionado?.categoria ?? null;

  const opcoesCliente = useMemo(() => {
    const lista = clientes?.content ?? [];
    const todos = clienteCriado && !lista.some((c) => c.id === clienteCriado.id) ? [clienteCriado, ...lista] : lista;
    return todos.map((c) => ({
      value: c.id!,
      label: c.nome ?? '',
      sublabel: c.documento ? formatCpfOuCnpj(c.documento) : undefined,
    }));
  }, [clientes, clienteCriado]);

  useEffect(() => {
    if (open) {
      setBuscaCliente('');
      setClienteCriado(null);
      setObservacaoAberta(false);
      reset(
        agendamento
          ? {
              clienteId: agendamento.clienteId ?? 0,
              veiculoId: agendamento.veiculoId ?? 0,
              dataHora: toDateTimeLocalValue(agendamento.dataHora),
              observacoes: agendamento.observacoes ?? '',
              servicoIds: agendamento.servicos?.map((s) => s.id!).filter(Boolean) ?? [],
            }
          : { clienteId: 0, veiculoId: 0, dataHora: defaultDate ?? '', servicoIds: [] },
      );
    }
  }, [open, agendamento, defaultDate, reset]);

  // Cliente com um único veículo: já vem selecionado, é um clique a menos.
  useEffect(() => {
    if (veiculos?.length === 1 && !getValues('veiculoId')) {
      setValue('veiculoId', veiculos[0].id ?? 0, { shouldValidate: true });
    }
  }, [veiculos, getValues, setValue]);

  const [dataParte = '', horaParte = ''] = dataHora.split('T');

  function atualizarDataHora(data: string, hora: string) {
    setValue('dataHora', data ? `${data}T${hora || HORA_PADRAO}` : '', { shouldValidate: true, shouldDirty: true });
  }

  // Trocar o veículo troca a categoria dos serviços oferecidos: o que já tinha
  // sido marcado e é de outra categoria sai da seleção (avisando), em vez de
  // seguir escondido atrás do filtro.
  function aoEscolherVeiculo(novoId: number, onChange: (id: number) => void) {
    onChange(novoId);
    const categoria = veiculos?.find((v) => v.id === novoId)?.categoria;
    if (!categoria) return;
    const atuais = getValues('servicoIds') ?? [];
    const mantidos = atuais.filter((id) => servicosAtivos.find((s) => s.id === id)?.categoria === categoria);
    if (mantidos.length !== atuais.length) {
      setValue('servicoIds', mantidos, { shouldDirty: true });
      const removidos = atuais.length - mantidos.length;
      toast.info(
        `${removidos} ${removidos === 1 ? 'serviço foi removido' : 'serviços foram removidos'} por não ${removidos === 1 ? 'ser' : 'serem'} da categoria ${categoria} do veículo.`,
      );
    }
  }

  async function onSubmit(values: FormValues, abrirOrcamento = false) {
    try {
      const payload = { ...values, dataHora: new Date(values.dataHora).toISOString() };
      if (isEditing && agendamento?.id != null) {
        await updateMutation.mutateAsync({ id: agendamento.id, payload });
        toast.success('Agendamento atualizado.');
      } else {
        const criado = await createMutation.mutateAsync(payload);
        toast.success('Agendamento criado.');
        if (abrirOrcamento && criado.id != null) {
          onClose();
          onSalvoParaOrcamento?.(criado.id);
          return;
        }
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o agendamento.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const mostrarObservacao = observacaoAberta || !!observacoes;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar agendamento' : 'Novo agendamento'}
      size="3xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {!isEditing && podeCriarOrcamento && (
            <Button type="button" variant="outline" loading={saving} onClick={handleSubmit((v) => onSubmit(v, true))}>
              Criar orçamento
            </Button>
          )}
          <Button type="submit" form={FORM_ID} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit((v) => onSubmit(v))} className="flex flex-col gap-6" noValidate>
        <section aria-label="Cliente, veículo e data" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-5">
            <div className="min-w-0 flex-1">
              <Controller
                control={control}
                name="clienteId"
                render={({ field }) => (
                  <Combobox
                    label="Cliente"
                    required
                    placeholder="Buscar cliente pelo nome..."
                    error={errors.clienteId?.message}
                    value={field.value || undefined}
                    onChange={(id) => {
                      field.onChange(id);
                      // O veículo escolhido antes pertencia a outro cliente.
                      setValue('veiculoId', 0);
                    }}
                    options={opcoesCliente}
                    query={buscaCliente}
                    onQueryChange={setBuscaCliente}
                    loading={buscandoClientes}
                  />
                )}
              />
            </div>
            {podeCadastrarCliente && (
              // mt-6: alinha o botão com o campo, abaixo da linha do rótulo "Cliente".
              <Button type="button" variant="outline" className="mt-6 shrink-0 text-base" onClick={() => setNovoClienteAberto(true)}>
                <UserPlus size={18} /> Novo cliente
              </Button>
            )}
          </div>

          <div className="lg:col-span-3">
            <Controller
              control={control}
              name="veiculoId"
              render={({ field }) => (
                <Select
                  label="Veículo"
                  required
                  disabled={!clienteId}
                  hint={!clienteId ? 'Escolha o cliente primeiro' : undefined}
                  error={errors.veiculoId?.message}
                  value={field.value ?? 0}
                  onChange={(e) => aoEscolherVeiculo(Number(e.target.value), field.onChange)}
                >
                  <option value={0}>Selecione um veículo</option>
                  {veiculos?.map((v: VeiculoResponse) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} — {v.marca} {v.modelo}
                      {v.categoria ? ` (cat. ${v.categoria})` : ''}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <Input
              label="Data"
              type="date"
              required
              value={dataParte}
              onChange={(e) => atualizarDataHora(e.target.value, horaParte)}
            />
            <div className="flex gap-1.5" role="group" aria-label="Atalhos de data">
              <AtalhoData rotulo="Hoje" ativo={dataParte === hojeIso()} onClick={() => atualizarDataHora(hojeIso(), horaParte)} />
              <AtalhoData rotulo="Amanhã" ativo={dataParte === amanhaIso()} onClick={() => atualizarDataHora(amanhaIso(), horaParte)} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Input
              label="Hora"
              type="time"
              required
              value={horaParte}
              onChange={(e) => atualizarDataHora(dataParte || hojeIso(), e.target.value)}
            />
          </div>

          {errors.dataHora && (
            <p className="text-sm font-medium text-danger sm:col-span-2 lg:col-span-12">{errors.dataHora.message}</p>
          )}
          <input type="hidden" {...register('dataHora')} />
        </section>

        <section aria-label="Serviços" className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-ink">
            Serviços <span className="text-danger">*</span>
          </h3>
          <Controller
            control={control}
            name="servicoIds"
            render={({ field }) => (
              <ServicoPicker
                servicos={servicosAtivos}
                value={field.value ?? []}
                onChange={field.onChange}
                loading={carregandoServicos}
                error={errors.servicoIds?.message}
                aguardandoVeiculo={!veiculoSelecionado && !isEditing}
                categoriaVeiculo={categoriaVeiculo}
              />
            )}
          />

          {mostrarObservacao ? (
            <Textarea label="Observações" rows={2} {...register('observacoes')} />
          ) : (
            <button
              type="button"
              onClick={() => setObservacaoAberta(true)}
              className="inline-flex items-center gap-1.5 self-start text-base font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              <MessageSquarePlus size={16} /> Adicionar observação
            </button>
          )}
        </section>
      </form>

      <ClienteFormModal
        open={novoClienteAberto}
        onClose={() => setNovoClienteAberto(false)}
        onCriado={(criado) => {
          // O cliente novo já fica selecionado, sem esperar a lista recarregar
          // (a busca atual pode nem listá-lo).
          setClienteCriado(criado);
          setBuscaCliente('');
          setValue('clienteId', criado.id ?? 0, { shouldValidate: true });
          setValue('veiculoId', criado.veiculos?.length === 1 ? (criado.veiculos[0].id ?? 0) : 0);
        }}
      />
    </Modal>
  );
}

function AtalhoData({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={
        ativo
          ? 'rounded-full border border-brand-600 bg-brand-600 px-3.5 py-1 text-sm font-medium text-white'
          : 'rounded-full border border-border bg-surface px-3.5 py-1 text-sm font-medium text-ink-muted transition-colors hover:border-brand-300 hover:text-ink'
      }
    >
      {rotulo}
    </button>
  );
}
