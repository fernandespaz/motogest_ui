import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Coins, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, Select } from '@/components/ui/Field';
import { useAtualizarCustoFixo, useCriarCustoFixo, useCustosFixos, useExcluirCustoFixo } from '@/hooks/useHoraTecnica';
import type { CategoriaCustoFixo, CustoFixoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const CATEGORIAS_CUSTO_FIXO: Record<CategoriaCustoFixo, string> = {
  ALUGUEL: 'Aluguel',
  ENERGIA: 'Energia',
  AGUA: 'Água',
  SALARIOS: 'Salários',
  ENCARGOS: 'Encargos',
  PRO_LABORE: 'Pró-labore',
  CONTADOR: 'Contador',
  SEGUROS: 'Seguros',
  SISTEMAS: 'Sistemas',
  OUTROS: 'Outros',
};

const FORM_ID = 'custo-fixo-form';

const schema = z.object({
  categoria: z.enum(Object.keys(CATEGORIAS_CUSTO_FIXO) as [CategoriaCustoFixo, ...CategoriaCustoFixo[]], {
    errorMap: () => ({ message: 'Selecione a categoria' }),
  }),
  descricao: z.string().trim().min(1, 'Informe a descrição').max(150, 'Máximo 150 caracteres'),
  valorMensal: z.coerce.number({ invalid_type_error: 'Informe o valor' }).min(0, 'Valor inválido'),
});

type FormValues = z.infer<typeof schema>;

function CustoFixoFormModal({
  open,
  onClose,
  custo,
}: {
  open: boolean;
  onClose: () => void;
  custo: CustoFixoResponse | null;
}) {
  const criar = useCriarCustoFixo();
  const atualizar = useAtualizarCustoFixo();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset(
        custo
          ? { categoria: custo.categoria, descricao: custo.descricao ?? '', valorMensal: custo.valorMensal ?? 0 }
          : { categoria: 'ALUGUEL', descricao: '', valorMensal: undefined },
      );
    }
  }, [open, custo, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (custo?.id != null) {
        await atualizar.mutateAsync({ id: custo.id, payload: values });
        toast.success('Custo fixo atualizado.');
      } else {
        await criar.mutateAsync(values);
        toast.success('Custo fixo cadastrado.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o custo fixo.'));
    }
  }

  const saving = criar.isPending || atualizar.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={custo ? 'Editar custo fixo' : 'Novo custo fixo'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Select label="Categoria" required error={errors.categoria?.message} {...register('categoria')}>
          {Object.entries(CATEGORIAS_CUSTO_FIXO).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="Descrição" required placeholder="Ex.: Aluguel do galpão" error={errors.descricao?.message} {...register('descricao')} />
        <Input
          label="Valor mensal (R$)"
          type="number"
          step="0.01"
          required
          error={errors.valorMensal?.message}
          {...register('valorMensal')}
        />
      </form>
    </Modal>
  );
}

export function CustosFixosCard() {
  const { data: custos = [], isLoading } = useCustosFixos();
  const excluir = useExcluirCustoFixo();
  // undefined = modal fechado; null = criando; objeto = editando.
  const [editando, setEditando] = useState<CustoFixoResponse | null | undefined>(undefined);
  const [removendo, setRemovendo] = useState<CustoFixoResponse | null>(null);
  const total = custos.reduce((soma, c) => soma + (c.valorMensal ?? 0), 0);

  async function confirmarExclusao() {
    if (removendo?.id == null) return;
    try {
      await excluir.mutateAsync(removendo.id);
      toast.success('Custo fixo removido.');
      setRemovendo(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o custo fixo.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title="Custos fixos mensais"
        subtitle={custos.length ? `Total: ${formatCurrency(total)} por mês` : 'Base do custo por hora da oficina'}
        action={
          <Button size="sm" onClick={() => setEditando(null)}>
            <Plus size={16} /> Novo custo
          </Button>
        }
      />
      <DataTable<CustoFixoResponse>
        loading={isLoading}
        rows={custos}
        rowKey={(c) => c.id!}
        emptyIcon={Coins}
        emptyTitle="Nenhum custo fixo cadastrado"
        emptyDescription="Aluguel, energia, salários... tudo que a oficina paga todo mês, independente do volume de serviço."
        columns={[
          {
            header: 'Categoria',
            render: (c) => <Badge tone="brand">{c.categoria ? CATEGORIAS_CUSTO_FIXO[c.categoria] : '—'}</Badge>,
          },
          { header: 'Descrição', render: (c) => <span className="text-ink">{c.descricao}</span> },
          {
            header: 'Valor mensal',
            render: (c) => <span className="font-medium text-ink">{formatCurrency(c.valorMensal)}</span>,
            className: 'text-right',
          },
          {
            header: '',
            render: (c) => (
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  aria-label={`Editar ${c.descricao}`}
                  onClick={() => setEditando(c)}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Remover ${c.descricao}`}
                  onClick={() => setRemovendo(c)}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <CustoFixoFormModal open={editando !== undefined} onClose={() => setEditando(undefined)} custo={editando ?? null} />
      <ConfirmDialog
        open={!!removendo}
        title="Remover custo fixo?"
        description={`"${removendo?.descricao ?? ''}" deixa de entrar no cálculo da hora técnica. A remoção fica registrada no histórico.`}
        confirmLabel="Remover"
        variant="danger"
        loading={excluir.isPending}
        onConfirm={confirmarExclusao}
        onCancel={() => setRemovendo(null)}
      />
    </Card>
  );
}
