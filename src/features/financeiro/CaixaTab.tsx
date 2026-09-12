import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth, addDays } from 'date-fns';
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import {
  useCaixaPeriodo,
  useCaixaSaldo,
  useRegistrarCaixa,
  useContasPagarPendentes,
  useContasReceberPendentes,
} from '@/hooks/useFinanceiro';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  categoria: z.enum(['VENDA_OS', 'PAGAMENTO_CONTA', 'RECEBIMENTO_CONTA', 'OUTRO']),
  valor: z.coerce.number().positive('Informe um valor válido'),
  descricao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CaixaTab() {
  const [inicio, setInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fim, setFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalOpen, setModalOpen] = useState(false);

  const inicioIso = `${inicio}T00:00:00`;
  const fimIso = `${fim}T23:59:59`;
  const { data: movimentos, isLoading } = useCaixaPeriodo(inicioIso, fimIso);
  const { data: saldo } = useCaixaSaldo(inicioIso, fimIso);
  const registrar = useRegistrarCaixa();

  const proximos7dInicio = format(new Date(), 'yyyy-MM-dd');
  const proximos7dFim = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: contasPagarProximas } = useContasPagarPendentes(proximos7dInicio, proximos7dFim);
  const { data: contasReceberProximas } = useContasReceberPendentes(proximos7dInicio, proximos7dFim);
  const totalAPagar = (contasPagarProximas ?? []).reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalAReceber = (contasReceberProximas ?? []).reduce((sum, c) => sum + (c.valor ?? 0), 0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { tipo: 'ENTRADA', categoria: 'OUTRO' } });

  async function onSubmit(values: FormValues) {
    try {
      await registrar.mutateAsync(values);
      toast.success('Lançamento registrado.');
      reset({ tipo: 'ENTRADA', categoria: 'OUTRO', valor: undefined, descricao: '' });
      setModalOpen(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar o lançamento.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-danger">
              <ArrowDownRight size={18} />
            </div>
            <div>
              <p className="text-xs text-ink-muted">A pagar nos próximos 7 dias</p>
              <p className="text-lg font-semibold text-ink">{formatCurrency(totalAPagar)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-success">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <p className="text-xs text-ink-muted">A receber nos próximos 7 dias</p>
              <p className="text-lg font-semibold text-ink">{formatCurrency(totalAReceber)}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input label="De" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <Input label="Até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Novo lançamento
        </Button>
        <div className="ml-auto rounded-xl border border-border bg-surface px-4 py-2.5 text-right">
          <p className="text-xs text-ink-muted">Saldo do período</p>
          <p className={`text-lg font-semibold ${typeof saldo === 'number' && saldo < 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(typeof saldo === 'number' ? saldo : 0)}
          </p>
        </div>
      </div>

      <Card>
        <DataTable
          loading={isLoading}
          rows={movimentos ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum lançamento no período"
          columns={[
            {
              header: 'Tipo',
              render: (row) =>
                row.tipo === 'ENTRADA' ? (
                  <span className="flex items-center gap-1.5 text-success">
                    <ArrowUpCircle size={16} /> Entrada
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-danger">
                    <ArrowDownCircle size={16} /> Saída
                  </span>
                ),
            },
            { header: 'Descrição', render: (row) => row.descricao || '—' },
            { header: 'Categoria', render: (row) => <Badge>{row.categoria}</Badge>, hideBelow: 'sm' },
            { header: 'Data', render: (row) => formatDateTime(row.dataMovimento), hideBelow: 'md' },
            {
              header: 'Valor',
              render: (row) => (
                <span className={row.tipo === 'ENTRADA' ? 'text-success' : 'text-danger'}>
                  {row.tipo === 'SAIDA' ? '- ' : ''}
                  {formatCurrency(row.valor)}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo lançamento de caixa">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Select label="Tipo" {...register('tipo')}>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </Select>
          <Select label="Categoria" {...register('categoria')}>
            <option value="VENDA_OS">Venda de OS</option>
            <option value="PAGAMENTO_CONTA">Pagamento de conta</option>
            <option value="RECEBIMENTO_CONTA">Recebimento de conta</option>
            <option value="OUTRO">Outro</option>
          </Select>
          <Input label="Valor (R$)" type="number" step="0.01" required error={errors.valor?.message} {...register('valor')} />
          <Textarea label="Descrição" {...register('descricao')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={registrar.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
