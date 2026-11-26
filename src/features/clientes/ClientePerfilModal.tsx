import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, FilePlus2, Mail, MessageCircle, Phone } from 'lucide-react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormSection } from '@/components/ui/FormSection';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useTodosOrcamentos } from '@/hooks/useOrcamentos';
import { useAuthStore } from '@/store/authStore';
import type { ClienteResponse, OrcamentoResponse, OrdemServicoResponse } from '@/api/types';
import { formatCurrency, formatDate, formatDocumento, formatPhone, onlyDigits, telefoneNacional } from '@/lib/formatters';
import { TOM_CATEGORIA_COMPLEXIDADE } from '@/lib/categoria';
import { metaFor, orcamentoStatusMeta, ordemServicoStatusMeta } from '@/lib/statusMeta';

const OS_ENCERRADAS = ['CONCLUIDA', 'FATURADO', 'ENTREGUE', 'CANCELADA'];
const ORCAMENTO_EM_ABERTO = ['RASCUNHO', 'ENVIADO', 'APROVADO'];
const MAX_HISTORICO = 5;

/** Resumo do relacionamento: o que está em aberto agora e quando o cliente esteve aqui pela última vez. */
export function resumirCliente(ordens: OrdemServicoResponse[], orcamentos: OrcamentoResponse[]) {
  const datas = ordens
    .map((o) => o.dataAbertura)
    .filter((d): d is string => !!d)
    .sort();
  return {
    osEmAberto: ordens.filter((o) => !OS_ENCERRADAS.includes(o.status ?? '')).length,
    orcamentosEmAberto: orcamentos.filter((o) => ORCAMENTO_EM_ABERTO.includes(o.status ?? '')).length,
    ultimaVisita: datas.length ? datas[datas.length - 1] : undefined,
  };
}

/** Rota de novo orçamento já com o cliente (e, se informado, o veículo) escolhido. */
export function rotaNovoOrcamento(cliente: ClienteResponse, veiculoId?: number): string {
  const params = new URLSearchParams({ clienteId: String(cliente.id), clienteNome: cliente.nome ?? '' });
  if (veiculoId != null) params.set('veiculoId', String(veiculoId));
  return `/orcamentos/novo?${params.toString()}`;
}

function Resumo({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl bg-surface-alt px-3 py-2">
      <p className="text-xs text-ink-muted">{rotulo}</p>
      <p className="text-base font-semibold text-ink">{valor}</p>
      {nota && <p className="text-[11px] text-ink-muted">{nota}</p>}
    </div>
  );
}

/**
 * Perfil do cliente: o clique na linha da lista leva aqui (leitura + ações), não ao formulário de edição.
 * Quem procura um cliente quase sempre quer começar algo — orçar, agendar, ligar —, não editar o cadastro.
 */
export function ClientePerfilModal({
  cliente,
  onClose,
  onEditar,
  onRemover,
}: {
  cliente: ClienteResponse | null;
  onClose: () => void;
  onEditar: (c: ClienteResponse) => void;
  onRemover: (c: ClienteResponse) => void;
}) {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeOrcar = hasPermission('ORCAMENTO_WRITE');
  const podeAgendar = hasPermission('AGENDA_WRITE');
  const podeVerOs = hasPermission('ORDEM_SERVICO_READ');
  const podeVerOrcamentos = hasPermission('ORCAMENTO_READ');

  // Histórico só é buscado com o perfil aberto e atrás da permissão de leitura de cada endpoint.
  // A API de OS filtra por documento do cliente; a de orçamentos não filtra, então o recorte é feito aqui.
  const documento = cliente?.documento ? onlyDigits(cliente.documento) : undefined;
  const { data: ordensPage } = useOrdensServico(
    { page: 0, size: 20, sort: 'id,desc', clienteDocumento: documento },
    { enabled: !!cliente && !!documento && podeVerOs, silentError: true },
  );
  const { data: todosOrcamentos } = useTodosOrcamentos('id,desc', { enabled: !!cliente && podeVerOrcamentos, silentError: true });

  const ordens = useMemo(() => ordensPage?.content ?? [], [ordensPage]);
  // A busca traz só as 20 OS mais recentes: se há mais, o contador de "em aberto" avisa em vez de parecer exato.
  const osLimitadas = (ordensPage?.totalElements ?? 0) > ordens.length;
  const orcamentos = useMemo(
    () => (todosOrcamentos ?? []).filter((o: OrcamentoResponse) => cliente?.id != null && o.clienteId === cliente.id),
    [todosOrcamentos, cliente?.id],
  );
  const resumo = useMemo(() => resumirCliente(ordens, orcamentos), [ordens, orcamentos]);

  // Links só com número válido e normalizado (sem 55/zero duplicados); o texto mostra o mesmo número.
  const telefone = telefoneNacional(cliente?.telefone) ?? '';
  const temHistorico = podeVerOs || podeVerOrcamentos;

  return (
    <Modal open={!!cliente} onClose={onClose} title={cliente?.nome ?? 'Cliente'} size="lg">
      {cliente && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <Badge>{cliente.tipoPessoa === 'PJ' ? 'Jurídica' : 'Física'}</Badge>
            {cliente.ativo === false && <Badge tone="neutral">Inativo</Badge>}
            <span className="font-mono">{formatDocumento(cliente.documento ?? '', cliente.tipoPessoa === 'PJ' ? 'PJ' : 'PF')}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {podeOrcar && (
              <Button onClick={() => navigate(rotaNovoOrcamento(cliente))}>
                <FilePlus2 size={16} /> Novo orçamento
              </Button>
            )}
            {podeAgendar && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/agenda?novoParaCliente=${cliente.id}`)}
              >
                <CalendarPlus size={16} /> Agendar
              </Button>
            )}
            {telefone && (
              <>
                <a
                  href={`tel:+55${telefone}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-surface-alt"
                >
                  <Phone size={16} aria-hidden="true" /> Ligar
                </a>
                <a
                  href={`https://wa.me/55${telefone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-surface-alt"
                >
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                </a>
              </>
            )}
            {cliente.email && (
              <a
                href={`mailto:${cliente.email}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-surface-alt"
              >
                <Mail size={16} aria-hidden="true" /> E-mail
              </a>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Telefone</dt>
              <dd className="text-ink">{telefone ? formatPhone(telefone) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">E-mail</dt>
              <dd className="break-all text-ink">{cliente.email || '—'}</dd>
            </div>
          </dl>

          {temHistorico && (
            <section aria-label="Resumo" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {podeVerOs && <Resumo rotulo="OS em aberto" valor={String(resumo.osEmAberto)} nota={osLimitadas ? 'entre as 20 mais recentes' : undefined} />}
              {podeVerOrcamentos && <Resumo rotulo="Orçamentos em aberto" valor={String(resumo.orcamentosEmAberto)} />}
              {podeVerOs && <Resumo rotulo="Última visita" valor={resumo.ultimaVisita ? formatDate(resumo.ultimaVisita) : '—'} />}
            </section>
          )}

          <FormSection title={`Veículos (${cliente.veiculos?.length ?? 0})`}>
            {(cliente.veiculos?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-muted">Nenhum veículo cadastrado.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {cliente.veiculos!.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="font-mono text-sm font-semibold text-ink">{v.placa}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                      {[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}
                    </span>
                    {v.categoria && <Badge tone={TOM_CATEGORIA_COMPLEXIDADE[v.categoria]}>Cat. {v.categoria}</Badge>}
                    {podeOrcar && (
                      <Button size="sm" variant="outline" onClick={() => navigate(rotaNovoOrcamento(cliente, v.id))}>
                        Orçar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          {podeVerOs && ordens.length > 0 && (
            <FormSection title="Ordens de serviço recentes">
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {ordens.slice(0, MAX_HISTORICO).map((o) => {
                  const meta = metaFor(ordemServicoStatusMeta, o.status);
                  return (
                    <li key={o.id}>
                      <Link to={`/ordens-servico/${o.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-alt">
                        <span className="font-medium text-ink">{o.numero ?? `#${o.id}`}</span>
                        <span className="flex-1 truncate text-ink-muted">{o.veiculoPlaca ?? ''}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="w-24 text-right tabular-nums text-ink">{formatCurrency(o.valorTotal)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </FormSection>
          )}

          {podeVerOrcamentos && orcamentos.length > 0 && (
            <FormSection title="Orçamentos recentes">
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {orcamentos.slice(0, MAX_HISTORICO).map((o) => {
                  const meta = metaFor(orcamentoStatusMeta, o.status);
                  return (
                    <li key={o.id}>
                      <Link to={`/orcamentos/${o.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-alt">
                        <span className="font-medium text-ink">#{o.id}</span>
                        <span className="flex-1 truncate text-ink-muted">{o.veiculoPlaca ?? ''}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="w-24 text-right tabular-nums text-ink">{formatCurrency(o.valorTotal)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </FormSection>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => onEditar(cliente)}>
              <PencilSimple size={16} /> Editar cadastro
            </Button>
            {/* Remover é raro e irreversível: fica aqui no rodapé do perfil, discreto, e não em cada linha da lista. */}
            <Button variant="ghost" className="text-danger" onClick={() => onRemover(cliente)}>
              <Trash size={16} /> Remover cliente
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
