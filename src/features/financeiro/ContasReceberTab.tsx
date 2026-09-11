import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useContasReceber,
  useCreateContaReceber,
  useReceberConta,
  useCancelarContaReceber,
} from '@/hooks/useFinanceiro';
import { useClientes } from '@/hooks/useClientes';
import type { ClienteResponse, ContaReceberResponse } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { contaStatusMeta, metaFor } from '@/lib/statusMeta';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  descricao: z.string().min(1, 'Informe a descrição'),
  clienteId: z.coerce.number().optional(),
  valor: z.coerce.number().positive('Informe um valor válido'),
  dataVencimento: z.string().min(1, 'Informe o vencimento'),
});

type FormValues = z.infer<typeof schema>;

export function ContasReceberTab() {
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelando, setCancelando] = useState<ContaReceberResponse | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');

  const { data, isLoading } = useContasReceber({ page, size: 20 });
  const { data: clientes } = useClientes({ size: 50, nome: buscaCliente || undefined });
  const create = useCreateContaReceber();
  const receber = useReceberConta();
  const cancelar = useCancelarContaReceber();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success('Conta a receber cadastrada.');
      reset();
      setModalOpen(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível cadastrar.'));
    }
  }

  async function handleReceber(id: number) {
    try {
      await receber.mutateAsync(id);
      toast.success('Conta marcada como recebida.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível marcar como recebida.'));
    }
  }

  async function confirmCancelar() {
    if (!cancelando?.id) return;
    try {
      await cancelar.mutateAsync(cancelando.id);
      toast.success('Conta cancelada.');
      setCancelando(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível cancelar.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-start" onClick={() => setModalOpen(true)}>
        <Plus size={16} /> Nova conta a receber
      </Button>

      <Card>
        <DataTable<ContaReceberResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhuma conta a receber cadastrada"
          columns={[
            { header: 'Descrição', render: (row) => row.descricao },
            { header: 'Cliente', render: (row) => row.clienteNome || '—', hideBelow: 'sm' },
            { header: 'Vencimento', render: (row) => formatDate(row.dataVencimento) },
            { header: 'Valor', render: (row) => formatCurrency(row.valor) },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(contaStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            {
              header: '',
              render: (row) =>
                row.status === 'PENDENTE' || row.status === 'ATRASADO' ? (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleReceber(row.id!)} className="rounded-md p-1.5 text-ink-muted hover:bg-green-50 hover:text-success" title="Marcar como recebida">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setCancelando(row)} className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger" title="Cancelar">
                      <X size={16} />
                    </button>
                  </div>
                ) : null,
            },
          ]}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova conta a receber">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Descrição" required error={errors.descricao?.message} {...register('descricao')} />
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <div className="flex flex-col gap-1">
                <Input placeholder="Buscar cliente..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} />
                <Select value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value) || undefined)}>
                  <option value={0}>Sem cliente vinculado</option>
                  {clientes?.content?.map((c: ClienteResponse) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          />
          <Input label="Valor (R$)" type="number" step="0.01" required error={errors.valor?.message} {...register('valor')} />
          <Input label="Vencimento" type="date" required error={errors.dataVencimento?.message} {...register('dataVencimento')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={create.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!cancelando}
        title="Cancelar conta"
        description={`Deseja cancelar a conta "${cancelando?.descricao}"?`}
        confirmLabel="Cancelar conta"
        variant="danger"
        loading={cancelar.isPending}
        onConfirm={confirmCancelar}
        onCancel={() => setCancelando(null)}
      />
    </div>
  );
}
