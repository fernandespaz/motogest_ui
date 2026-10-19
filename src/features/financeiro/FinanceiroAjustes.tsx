import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarCheck, Plus } from 'lucide-react';
import { PencilSimple } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox, Input } from '@/components/ui/Field';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  useAtualizarCategoriaFinanceira,
  useAtualizarParametrosFinanceiros,
  useCategoriasFinanceiras,
  useCriarCategoriaFinanceira,
  useParametrosFinanceiros,
} from '@/hooks/useFinanceiro';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CategoriaFinanceiraResponse, TipoCategoriaFinanceira } from '@/api/types';
import { periodoDeFechamento } from './contasUtils';

/** Ajustes do financeiro: o dia de fechamento do mês e as categorias que classificam as contas. */
export function FinanceiroAjustes() {
  const podeEditar = useAuthStore((s) => s.hasPermission('FINANCEIRO_WRITE'));
  return (
    <div className="flex flex-col gap-5">
      <FechamentoMensal podeEditar={podeEditar} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CategoriasDoTipo tipo="DESPESA" titulo="Categorias de despesa" subtitulo="Onde o dinheiro da oficina é aplicado" podeEditar={podeEditar} />
        <CategoriasDoTipo tipo="RECEITA" titulo="Categorias de receita" subtitulo="De onde o dinheiro vem" podeEditar={podeEditar} />
      </div>
    </div>
  );
}

const diaSchema = z.object({
  diaFechamento: z.coerce.number({ invalid_type_error: 'Informe um dia entre 1 e 31' }).int().min(1, 'Informe um dia entre 1 e 31').max(31, 'Informe um dia entre 1 e 31'),
});

function FechamentoMensal({ podeEditar }: { podeEditar: boolean }) {
  const { data, isLoading } = useParametrosFinanceiros();
  const atualizar = useAtualizarParametrosFinanceiros();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof diaSchema>>({ resolver: zodResolver(diaSchema) });

  useEffect(() => {
    if (data) reset({ diaFechamento: data.diaFechamento });
  }, [data, reset]);

  const dia = Number(watch('diaFechamento'));
  const periodo = useMemo(() => (dia >= 1 && dia <= 31 ? periodoDeFechamento(dia) : null), [dia]);

  async function onSubmit(values: z.infer<typeof diaSchema>) {
    try {
      await atualizar.mutateAsync({ diaFechamento: values.diaFechamento });
      toast.success('Dia de fechamento atualizado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o dia de fechamento.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-brand-600" aria-hidden="true" /> Fechamento mensal
          </span>
        }
        subtitle="O dia em que o financeiro da oficina fecha o mês — a “data muro” dos balanços"
      />
      <CardBody>
        {isLoading ? (
          <PageSpinner label="Carregando..." />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Input
                label="Dia do fechamento"
                type="number"
                min={1}
                max={31}
                disabled={!podeEditar}
                error={errors.diaFechamento?.message}
                {...register('diaFechamento')}
              />
            </div>
            {podeEditar && (
              <Button type="submit" loading={atualizar.isPending} disabled={!isDirty}>
                Salvar
              </Button>
            )}
            {periodo && (
              <p className="pb-2 text-sm text-ink-muted">
                Período atual:{' '}
                <strong className="text-ink">
                  {formatDate(periodo.inicio)} a {formatDate(periodo.fim)}
                </strong>
                . Em meses mais curtos, o fechamento cai no último dia do mês.
              </p>
            )}
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function CategoriasDoTipo({
  tipo,
  titulo,
  subtitulo,
  podeEditar,
}: {
  tipo: TipoCategoriaFinanceira;
  titulo: string;
  subtitulo: string;
  podeEditar: boolean;
}) {
  const { data, isLoading } = useCategoriasFinanceiras({ tipo, incluirInativas: true });
  const atualizar = useAtualizarCategoriaFinanceira();
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<CategoriaFinanceiraResponse | null>(null);

  async function alternarAtiva(categoria: CategoriaFinanceiraResponse) {
    try {
      await atualizar.mutateAsync({
        id: categoria.id!,
        payload: { nome: categoria.nome!, tipo, fixa: categoria.fixa, ativo: !categoria.ativo },
      });
      toast.success(categoria.ativo ? 'Categoria desativada.' : 'Categoria reativada.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível alterar a categoria.'));
    }
  }

  return (
    <Card>
      <CardHeader
        title={titulo}
        subtitle={subtitulo}
        action={
          podeEditar ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditando(null);
                setFormAberto(true);
              }}
            >
              <Plus size={14} /> Nova categoria
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <PageSpinner label="Carregando categorias..." />
      ) : (
        <ul className="divide-y divide-border">
          {(data ?? []).map((categoria) => (
            <li key={categoria.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={categoria.ativo ? 'flex-1 text-sm font-medium text-ink' : 'flex-1 text-sm text-ink-muted line-through'}>
                {categoria.nome}
              </span>
              {categoria.fixa && <Badge tone="brand">Fixa</Badge>}
              {!categoria.ativo && <Badge>Inativa</Badge>}
              {podeEditar && (
                <>
                  <IconActionButton
                    icon={PencilSimple}
                    label={`Editar ${categoria.nome}`}
                    tone="neutral"
                    onClick={() => {
                      setEditando(categoria);
                      setFormAberto(true);
                    }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => alternarAtiva(categoria)} disabled={atualizar.isPending}>
                    {categoria.ativo ? 'Desativar' : 'Reativar'}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <CategoriaFormModal tipo={tipo} categoria={editando} open={formAberto} onClose={() => setFormAberto(false)} />
    </Card>
  );
}

const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(80, 'No máximo 80 caracteres'),
  fixa: z.boolean().optional(),
});

function CategoriaFormModal({
  tipo,
  categoria,
  open,
  onClose,
}: {
  tipo: TipoCategoriaFinanceira;
  categoria: CategoriaFinanceiraResponse | null;
  open: boolean;
  onClose: () => void;
}) {
  const criar = useCriarCategoriaFinanceira();
  const atualizar = useAtualizarCategoriaFinanceira();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof categoriaSchema>>({ resolver: zodResolver(categoriaSchema) });

  useEffect(() => {
    if (open) reset({ nome: categoria?.nome ?? '', fixa: categoria?.fixa ?? false });
  }, [open, categoria, reset]);

  async function onSubmit(values: z.infer<typeof categoriaSchema>) {
    try {
      const payload = { nome: values.nome.trim(), tipo, fixa: tipo === 'DESPESA' ? !!values.fixa : false };
      if (categoria?.id != null) await atualizar.mutateAsync({ id: categoria.id, payload: { ...payload, ativo: categoria.ativo } });
      else await criar.mutateAsync(payload);
      toast.success(categoria ? 'Categoria atualizada.' : 'Categoria criada.');
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar a categoria.'));
    }
  }

  const FORM_ID = `categoria-${tipo}-form`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${categoria ? 'Editar' : 'Nova'} categoria de ${tipo === 'DESPESA' ? 'despesa' : 'receita'}`}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={criar.isPending || atualizar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={criar.isPending || atualizar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
        {tipo === 'DESPESA' && (
          <div>
            <Checkbox label="Despesa fixa (aluguel, energia, salários...)" {...register('fixa')} />
            <p className="mt-1 text-xs text-ink-muted">Separa as despesas fixas das variáveis nos relatórios.</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
