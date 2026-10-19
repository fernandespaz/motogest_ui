import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowDownCircle, ArrowUpCircle, Lock, Plus } from 'lucide-react';
import { CheckCircle, PencilSimple, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  useCancelarContaPagar,
  useCancelarContaReceber,
  useCategoriasFinanceiras,
  usePagarConta,
  useReceberConta,
  useSituacaoFechamento,
  useTodasContasPagar,
  useTodasContasReceber,
} from '@/hooks/useFinanceiro';
import type { BaixaContaRequest, ContaPagarResponse, ContaReceberResponse } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { BaixaContaModal } from './BaixaContaModal';
import { ContaFormModal, type ContaEditavel, type TipoConta } from './ContaFormModal';
import {
  filtrarContas,
  resumirPorSituacao,
  situacaoDaConta,
  type SituacaoConta,
} from './contasUtils';
import { SituacaoContaBadge, rotuloSituacao } from './SituacaoContaBadge';
import { VencimentoInfo } from './VencimentoInfo';

const TAMANHO_PAGINA = 15;

/** Uma conta (a pagar ou a receber) vista pela tela — só o que ela precisa, igual nos dois lados. */
interface ContaTela {
  id: number;
  descricao: string;
  contraparte?: string;
  valor: number;
  dataVencimento?: string;
  status?: string;
  categoriaId?: number | null;
  categoriaNome?: string | null;
  documento?: string | null;
  parcela?: string;
  /** Veio do faturamento de uma OS — o valor pertence à OS, então a edição fica bloqueada. */
  deOrdemServico: boolean;
  original: ContaEditavel;
}

const TEXTOS = {
  pagar: {
    singular: 'conta a pagar',
    nova: 'Nova conta a pagar',
    contraparte: 'Fornecedor',
    quitar: 'Pagar',
    quitado: 'pagamento',
    buscar: 'Buscar por descrição ou fornecedor...',
    vazio: 'Nenhuma conta a pagar',
    icone: ArrowDownCircle,
  },
  receber: {
    singular: 'conta a receber',
    nova: 'Nova conta a receber',
    contraparte: 'Cliente',
    quitar: 'Receber',
    quitado: 'recebimento',
    buscar: 'Buscar por descrição ou cliente...',
    vazio: 'Nenhuma conta a receber',
    icone: ArrowUpCircle,
  },
} as const;

const FILTROS: { chave: SituacaoConta | 'todas'; rotulo: (t: TipoConta) => string }[] = [
  { chave: 'todas', rotulo: () => 'Todas' },
  { chave: 'vencida', rotulo: (t) => rotuloSituacao('vencida', t) + 's' },
  { chave: 'vence-hoje', rotulo: (t) => rotuloSituacao('vence-hoje', t) },
  { chave: 'a-vencer', rotulo: (t) => rotuloSituacao('a-vencer', t) },
  { chave: 'quitada', rotulo: (t) => rotuloSituacao('quitada', t) + 's' },
  { chave: 'cancelada', rotulo: (t) => rotuloSituacao('cancelada', t) + 's' },
];

/** Dados das contas do tipo pedido já no formato da tela, mais as ações de quitar e cancelar. */
function useContasDoTipo(tipo: TipoConta) {
  const pagar = useTodasContasPagar({ enabled: tipo === 'pagar' });
  const receber = useTodasContasReceber({ enabled: tipo === 'receber' });
  const quitarPagar = usePagarConta();
  const quitarReceber = useReceberConta();
  const cancelarPagar = useCancelarContaPagar();
  const cancelarReceber = useCancelarContaReceber();

  const consulta = tipo === 'pagar' ? pagar : receber;
  const contas = useMemo<ContaTela[]>(
    () =>
      (consulta.data ?? []).map((c) => ({
        id: c.id!,
        descricao: c.descricao ?? '',
        contraparte: tipo === 'pagar' ? (c as ContaPagarResponse).fornecedor : (c as ContaReceberResponse).clienteNome,
        valor: c.valor ?? 0,
        dataVencimento: c.dataVencimento,
        status: c.status,
        categoriaId: c.categoriaId,
        categoriaNome: c.categoriaNome,
        documento: c.documento,
        parcela: c.parcelaTotal ? `${c.parcelaNumero}/${c.parcelaTotal}` : undefined,
        deOrdemServico: tipo === 'receber' && (c as ContaReceberResponse).ordemServicoId != null,
        original: c,
      })),
    [consulta.data, tipo],
  );

  return {
    contas,
    carregando: consulta.isLoading,
    quitar: tipo === 'pagar' ? quitarPagar : quitarReceber,
    cancelar: tipo === 'pagar' ? cancelarPagar : cancelarReceber,
  };
}

export function ContasTab({ tipo, situacaoInicial = 'todas' }: { tipo: TipoConta; situacaoInicial?: SituacaoConta | 'todas' }) {
  const textos = TEXTOS[tipo];
  const [situacao, setSituacao] = useState<SituacaoConta | 'todas'>(situacaoInicial);
  const [termo, setTermo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | 'sem' | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<ContaTela | null>(null);
  const [quitando, setQuitando] = useState<ContaTela | null>(null);
  const [cancelando, setCancelando] = useState<ContaTela | null>(null);

  const { contas, carregando, quitar, cancelar } = useContasDoTipo(tipo);
  const podeVerFinanceiro = useAuthStore((s) => s.hasPermission('FINANCEIRO_READ'));
  const dataMuro = useSituacaoFechamento({ enabled: podeVerFinanceiro }).data?.dataMuro;
  // Conta de um período já fechado: o backend só aceita baixá-la; editar e cancelar ficam travados.
  const travada = (conta: ContaTela) => !!dataMuro && !!conta.dataVencimento && conta.dataVencimento <= dataMuro;
  const { data: categorias } = useCategoriasFinanceiras(
    { tipo: tipo === 'pagar' ? 'DESPESA' : 'RECEITA', incluirInativas: true },
  );

  const resumo = useMemo(() => resumirPorSituacao(contas), [contas]);
  const filtradas = useMemo(
    () => filtrarContas(contas, { situacao, termo, inicio, fim, categoriaId }, (c) => c.contraparte),
    [contas, situacao, termo, inicio, fim, categoriaId],
  );
  const semCategoria = useMemo(
    () => contas.filter((c) => c.categoriaId == null && situacaoDaConta(c) !== 'cancelada').length,
    [contas],
  );
  const totalFiltrado = useMemo(() => filtradas.reduce((soma, c) => soma + c.valor, 0), [filtradas]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / TAMANHO_PAGINA));
  const paginaAtual = Math.min(page, totalPages - 1);
  const linhas = filtradas.slice(paginaAtual * TAMANHO_PAGINA, (paginaAtual + 1) * TAMANHO_PAGINA);

  function aplicar<T>(setter: (valor: T) => void) {
    return (valor: T) => {
      setter(valor);
      setPage(0);
    };
  }

  async function confirmarQuitacao(baixa: BaixaContaRequest) {
    if (!quitando) return;
    try {
      await quitar.mutateAsync({ id: quitando.id, baixa });
      toast.success(tipo === 'pagar' ? 'Conta marcada como paga.' : 'Conta marcada como recebida.');
      setQuitando(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, `Não foi possível registrar o ${textos.quitado}.`));
    }
  }

  async function confirmarCancelamento() {
    if (!cancelando) return;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
          {FILTROS.map(({ chave, rotulo }) => {
            const quantidade = chave === 'todas' ? resumo.todas.quantidade : resumo[chave].quantidade;
            const ativo = situacao === chave;
            const alerta = chave === 'vencida' && quantidade > 0;
            return (
              <button
                key={chave}
                type="button"
                aria-pressed={ativo}
                aria-label={`${rotulo(tipo)} (${quantidade})`}
                onClick={() => aplicar(setSituacao)(chave)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  ativo
                    ? alerta
                      ? 'border-danger bg-danger text-white'
                      : 'border-brand-600 bg-brand-600 text-white'
                    : alerta
                      ? 'border-danger/50 bg-danger/10 text-danger hover:bg-danger/15'
                      : 'border-border bg-surface text-ink-muted hover:border-brand-300 hover:text-ink',
                )}
              >
                {rotulo(tipo)}
                <span className={clsx('text-xs tabular-nums', ativo ? 'text-white/80' : '')}>{quantidade}</span>
              </button>
            );
          })}
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setFormAberto(true);
          }}
        >
          <Plus size={18} /> {textos.nova}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput value={termo} onChange={aplicar(setTermo)} placeholder={textos.buscar} className="w-full max-w-sm" />
        <div className="w-56">
          <Select
            label="Categoria"
            value={categoriaId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              aplicar(setCategoriaId)(v === '' ? undefined : v === 'sem' ? 'sem' : Number(v));
            }}
          >
            <option value="">Todas</option>
            <option value="sem">Sem categoria{semCategoria > 0 ? ` (${semCategoria})` : ''}</option>
            {(categorias ?? []).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
                {cat.ativo === false ? ' (inativa)' : ''}
              </option>
            ))}
          </Select>
        </div>
        <Input label="Vencimento de" type="date" value={inicio} onChange={(e) => aplicar(setInicio)(e.target.value)} />
        <Input label="até" type="date" value={fim} onChange={(e) => aplicar(setFim)(e.target.value)} />
        <p className="ml-auto pb-2 text-sm text-ink-muted">
          {filtradas.length} {filtradas.length === 1 ? 'conta' : 'contas'} ·{' '}
          <span className="font-semibold text-ink">{formatCurrency(totalFiltrado)}</span>
        </p>
      </div>

      <Card>
        <DataTable<ContaTela>
          loading={carregando}
          rows={linhas}
          rowKey={(row) => row.id}
          emptyIcon={textos.icone}
          emptyTitle={contas.length === 0 ? textos.vazio : 'Nenhuma conta com esses filtros'}
          emptyDescription={contas.length === 0 ? undefined : 'Ajuste a situação, a busca ou o período.'}
          columns={[
            { header: 'Vencimento', render: (row) => <VencimentoInfo conta={row} /> },
            {
              header: 'Descrição',
              render: (row) => (
                <div className="leading-tight">
                  <p className="font-medium text-ink">
                    {row.descricao}
                    {row.parcela && <span className="ml-2 text-xs font-normal text-ink-muted">parcela {row.parcela}</span>}
                  </p>
                  {row.contraparte && <p className="text-xs text-ink-muted">{row.contraparte}</p>}
                </div>
              ),
            },
            {
              header: 'Categoria',
              render: (row) =>
                row.categoriaNome ? <span className="text-ink">{row.categoriaNome}</span> : <Badge tone="warning">Sem categoria</Badge>,
              hideBelow: 'md',
            },
            { header: 'Valor', render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.valor)}</span> },
            { header: 'Situação', render: (row) => <SituacaoContaBadge situacao={situacaoDaConta(row)} tipo={tipo} /> },
            {
              header: '',
              render: (row) => {
                const situacaoLinha = situacaoDaConta(row);
                const emAberto = situacaoLinha === 'vencida' || situacaoLinha === 'vence-hoje' || situacaoLinha === 'a-vencer';
                if (!emAberto) return null;
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    <IconActionButton icon={CheckCircle} label={textos.quitar} tone="success" onClick={() => setQuitando(row)} />
                    {travada(row) && (
                      <span title={`Período fechado até ${formatDate(dataMuro)}`} className="inline-flex h-8 w-8 items-center justify-center text-ink-muted">
                        <Lock size={16} aria-label="Período fechado" />
                      </span>
                    )}
                    {!row.deOrdemServico && !travada(row) && (
                      <IconActionButton
                        icon={PencilSimple}
                        label="Editar"
                        tone="brand"
                        onClick={() => {
                          setEditando(row);
                          setFormAberto(true);
                        }}
                      />
                    )}
                    {!travada(row) && (
                      <IconActionButton icon={XCircle} label="Cancelar" tone="danger" onClick={() => setCancelando(row)} />
                    )}
                  </div>
                );
              },
            },
          ]}
        />
        {!carregando && filtradas.length > 0 && (
          <Pagination page={paginaAtual} totalPages={totalPages} totalElements={filtradas.length} onChange={setPage} />
        )}
      </Card>

      <ContaFormModal
        tipo={tipo}
        conta={editando?.original ?? null}
        open={formAberto}
        fechadoAte={dataMuro}
        onClose={() => {
          setFormAberto(false);
          setEditando(null);
        }}
      />

      <BaixaContaModal
        tipo={tipo}
        conta={quitando ? { descricao: quitando.descricao, valor: quitando.valor } : null}
        fechadoAte={dataMuro}
        loading={quitar.isPending}
        onConfirm={confirmarQuitacao}
        onClose={() => setQuitando(null)}
      />

      <ConfirmDialog
        open={!!cancelando}
        title="Cancelar conta"
        description={`Deseja cancelar a conta "${cancelando?.descricao}"?`}
        confirmLabel="Cancelar conta"
        variant="danger"
        loading={cancelar.isPending}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelando(null)}
      />
    </div>
  );
}

