import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, format } from 'date-fns';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Send,
  Users,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import { useDashboardConsultor } from '@/hooks/useDashboardConsultor';
import { agendamentoStatusMeta, metaFor, ordemServicoStatusMeta } from '@/lib/statusMeta';
import { formatCurrency } from '@/lib/formatters';
import { IndicadoresGrid } from '@/features/produtividade/IndicadoresConsultor';
import { StatCard } from './StatCard';

const MAX_ITENS = 6;

/** "hoje" / "há 1 dia" / "há 5 dias" — tempo que o cliente está com o orçamento na mão. */
export function tempoDesde(data: string | undefined, agora: Date = new Date()): string {
  if (!data) return '';
  const dias = differenceInCalendarDays(agora, new Date(data));
  if (dias <= 0) return 'hoje';
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

interface ItemPendencia {
  key: string | number;
  to: string;
  titulo: string;
  detalhe: string;
  lateral?: ReactNode;
}

function ListaPendencias({
  titulo,
  subtitulo,
  icone: Icone,
  itens,
  vazio,
  verTodos,
}: {
  titulo: string;
  subtitulo: string;
  icone: typeof FileText;
  itens: ItemPendencia[];
  vazio: string;
  verTodos?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Icone size={16} className="text-brand-600" /> {titulo}
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-ink-muted">{itens.length}</span>
          </span>
        }
        subtitle={subtitulo}
        action={
          verTodos && itens.length > MAX_ITENS ? (
            <Link to={verTodos} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              Ver todos
            </Link>
          ) : undefined
        }
      />
      {itens.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-muted">{vazio}</p>
      ) : (
        <ul className="divide-y divide-border">
          {itens.slice(0, MAX_ITENS).map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-alt"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.titulo}</p>
                  <p className="truncate text-xs text-ink-muted">{item.detalhe}</p>
                </div>
                {item.lateral}
                <ChevronRight size={16} className="shrink-0 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Painel do consultor: o que está parado esperando por ele (cliente sem
 * resposta, aprovado sem OS, carro pronto pra devolver), a agenda do dia e
 * os números do próprio mês — nada de caixa/contas da oficina.
 */
export function DashboardConsultor() {
  const navigate = useNavigate();
  const nome = useAuthStore((s) => s.nome);
  const usuarioId = useAuthStore((s) => s.usuarioId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { carteira, agendaHoje, produtividade, permissoes, isLoading } = useDashboardConsultor();

  if (isLoading) return <PageSpinner label="Carregando seu painel..." />;

  const cards = [
    permissoes.podeOrcamentos && {
      icon: Send,
      label: 'Aguardando resposta do cliente',
      value: String(carteira.aguardandoCliente.length),
      tone: carteira.aguardandoCliente.length ? ('warning' as const) : ('brand' as const),
    },
    permissoes.podeOrcamentos && {
      icon: CheckCircle2,
      label: 'Aprovados sem OS aberta',
      value: String(carteira.aprovadosSemOs.length),
      tone: carteira.aprovadosSemOs.length ? ('success' as const) : ('brand' as const),
    },
    permissoes.podeOs && {
      icon: Wrench,
      label: 'Minhas OS em execução',
      value: String(carteira.osEmExecucao.length),
      tone: 'brand' as const,
    },
    permissoes.podeOs && {
      icon: CheckCircle2,
      label: 'Prontas para entrega',
      value: String(carteira.osProntasParaEntrega.length),
      tone: carteira.osProntasParaEntrega.length ? ('success' as const) : ('brand' as const),
    },
    permissoes.podeAgenda && {
      icon: CalendarClock,
      label: 'Agendamentos hoje',
      value: String(agendaHoje.length),
      tone: 'brand' as const,
    },
    (permissoes.podeOrcamentos || permissoes.podeOs) && {
      icon: Users,
      label: 'Clientes na minha carteira',
      value: String(carteira.clientesNaCarteira),
      tone: 'brand' as const,
    },
  ].filter((c): c is Exclude<typeof c, false> => !!c);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Olá, ${nome?.split(' ')[0] ?? ''}`}
        subtitle="Seus atendimentos, pendências e números do mês"
        action={
          hasPermission('ORCAMENTO_WRITE') ? (
            <Button onClick={() => navigate('/orcamentos/novo')}>
              <Plus size={18} /> Novo orçamento
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, index) => (
          <StatCard key={c.label} index={index} icon={c.icon} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>

      {produtividade && (
        <section aria-label="Meu mês" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Meus números no mês</h2>
            <Link
              to={`/produtividade/consultores/${usuarioId}`}
              className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Ver detalhe
            </Link>
          </div>
          <IndicadoresGrid indicadores={produtividade.indicadores ?? {}} />
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {permissoes.podeOrcamentos && (
          <ListaPendencias
            titulo="Aguardando o cliente"
            subtitulo="Orçamentos enviados sem resposta — os mais antigos primeiro"
            icone={Clock3}
            verTodos="/orcamentos"
            vazio="Nenhum orçamento seu esperando resposta."
            itens={carteira.aguardandoCliente.map((o) => ({
              key: o.id!,
              to: `/orcamentos/${o.id}`,
              titulo: `#${o.id} · ${o.clienteNome ?? 'Cliente'}`,
              detalhe: [o.veiculoPlaca, `enviado ${tempoDesde(o.dataEmissao ?? o.createdAt)}`].filter(Boolean).join(' · '),
              lateral: <span className="text-sm font-semibold text-ink">{formatCurrency(o.valorTotal)}</span>,
            }))}
          />
        )}
        {permissoes.podeOrcamentos && (
          <ListaPendencias
            titulo="Aprovados — abrir OS"
            subtitulo="O cliente já disse sim; falta converter em ordem de serviço"
            icone={CheckCircle2}
            verTodos="/orcamentos"
            vazio="Nenhum orçamento aprovado aguardando conversão."
            itens={carteira.aprovadosSemOs.map((o) => ({
              key: o.id!,
              to: `/orcamentos/${o.id}`,
              titulo: `#${o.id} · ${o.clienteNome ?? 'Cliente'}`,
              detalhe: o.veiculoPlaca ?? '',
              lateral: <span className="text-sm font-semibold text-ink">{formatCurrency(o.valorTotal)}</span>,
            }))}
          />
        )}
        {permissoes.podeOs && (
          <ListaPendencias
            titulo="Prontas para entrega"
            subtitulo="OS concluídas — hora de avisar o cliente"
            icone={Wrench}
            verTodos="/ordens-servico"
            vazio="Nenhum veículo seu pronto para entrega."
            itens={carteira.osProntasParaEntrega.map((o) => ({
              key: o.id!,
              to: `/ordens-servico/${o.id}`,
              titulo: `${o.numero ?? `#${o.id}`} · ${o.clienteNome ?? 'Cliente'}`,
              detalhe: o.veiculoPlaca ?? '',
              lateral: <span className="text-sm font-semibold text-ink">{formatCurrency(o.valorTotal)}</span>,
            }))}
          />
        )}
        {permissoes.podeOs && (
          <ListaPendencias
            titulo="Minhas OS em execução"
            subtitulo="Acompanhe o andamento para atualizar o cliente"
            icone={Wrench}
            verTodos="/ordens-servico"
            vazio="Nenhuma OS sua em execução agora."
            itens={carteira.osEmExecucao.map((o) => {
              const meta = metaFor(ordemServicoStatusMeta, o.status);
              return {
                key: o.id!,
                to: `/ordens-servico/${o.id}`,
                titulo: `${o.numero ?? `#${o.id}`} · ${o.clienteNome ?? 'Cliente'}`,
                detalhe: [o.veiculoPlaca, o.usuarioResponsavelNome].filter(Boolean).join(' · '),
                lateral: <Badge tone={meta.tone}>{meta.label}</Badge>,
              };
            })}
          />
        )}
        {permissoes.podeAgenda && (
          <ListaPendencias
            titulo="Agenda de hoje"
            subtitulo="Chegadas previstas na oficina"
            icone={CalendarClock}
            verTodos="/agenda"
            vazio="Nenhum agendamento para hoje."
            itens={agendaHoje.map((a) => {
              const meta = metaFor(agendamentoStatusMeta, a.status);
              return {
                key: a.id!,
                to: '/agenda',
                titulo: `${a.dataHora ? format(new Date(a.dataHora), 'HH:mm') : '--:--'} · ${a.clienteNome ?? 'Cliente'}`,
                detalhe: a.veiculoPlaca ?? '',
                lateral: <Badge tone={meta.tone}>{meta.label}</Badge>,
              };
            })}
          />
        )}
      </div>
    </div>
  );
}
