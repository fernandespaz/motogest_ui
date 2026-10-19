import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { AgendamentoResponse, AgendamentoStatus } from '@/api/types';
import { agendamentoStatusMeta, metaFor, ordemServicoStatusMeta } from '@/lib/statusMeta';
import { servicosTexto } from './AgendaCard';
import { ETAPA_LABEL, proximoPasso, type AgendaItem, type ProximoPasso } from './agendaUtils';

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="col-span-2 text-ink">{children}</dd>
    </div>
  );
}

const ROTULO_PASSO: Record<Exclude<ProximoPasso, null>, string> = {
  CRIAR_ORCAMENTO: 'Criar orçamento',
  ABRIR_ORCAMENTO: 'Abrir orçamento',
  GERAR_OS: 'Gerar OS',
  ABRIR_OS: 'Abrir OS',
};

export interface PermissoesAgendaFluxo {
  /** AGENDA_WRITE: editar, confirmar e cancelar o agendamento. */
  editarAgenda: boolean;
  /** ORCAMENTO_WRITE: criar orçamento a partir do agendamento e converter em OS. */
  escreverOrcamento: boolean;
  lerOrcamento: boolean;
  lerOs: boolean;
}

/**
 * Ações de recepção/consultor: confirmar, cancelar e o PRÓXIMO PASSO do fluxo agendamento → orçamento
 * → OS. Iniciar, pausar, pedir peça e concluir são do técnico, na OS — por isso não há esses botões aqui.
 */
export function AgendamentoDetalheModal({
  item,
  permissoes,
  ocupado,
  onClose,
  onEditar,
  onStatus,
  onPasso,
}: {
  item: AgendaItem | null;
  permissoes: PermissoesAgendaFluxo;
  ocupado: boolean;
  onClose: () => void;
  onEditar: (ag: AgendamentoResponse) => void;
  onStatus: (ag: AgendamentoResponse, status: AgendamentoStatus) => void;
  onPasso: (item: AgendaItem, passo: Exclude<ProximoPasso, null>) => void;
}) {
  const ag = item?.ag;
  const os = item?.os;
  const meta = metaFor(agendamentoStatusMeta, item?.status);
  const naoIniciado = item?.status === 'AGENDADO' || item?.status === 'CONFIRMADO' || item?.status === 'NA_FILA';
  const passo = item ? proximoPasso(item) : null;
  const passoPermitido =
    passo === 'CRIAR_ORCAMENTO' || passo === 'GERAR_OS'
      ? permissoes.escreverOrcamento
      : passo === 'ABRIR_ORCAMENTO'
        ? permissoes.lerOrcamento
        : passo === 'ABRIR_OS'
          ? permissoes.lerOs
          : false;

  return (
    <Modal
      open={!!ag}
      onClose={onClose}
      title={ag ? `${ag.veiculoPlaca ?? 'Agendamento'} · ${ag.clienteNome ?? ''}` : ''}
      footer={
        ag && item ? (
          <>
            {permissoes.editarAgenda && (
              <Button size="sm" variant="secondary" onClick={() => onEditar(ag)}>
                Editar
              </Button>
            )}
            {permissoes.editarAgenda && item.status === 'AGENDADO' && (
              <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => onStatus(ag, 'CONFIRMADO')}>
                Confirmar
              </Button>
            )}
            {permissoes.editarAgenda && naoIniciado && !item.os && (
              <Button size="sm" variant="danger" disabled={ocupado} onClick={() => onStatus(ag, 'CANCELADO')}>
                Cancelar
              </Button>
            )}
            {passo && passoPermitido && (
              <Button size="sm" loading={ocupado} onClick={() => onPasso(item, passo)}>
                {ROTULO_PASSO[passo]}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {ag && item && (
        <dl className="flex flex-col gap-3">
          <Linha rotulo="Status">
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </Linha>
          <Linha rotulo="Etapa">{ETAPA_LABEL[item.etapa]}</Linha>
          <Linha rotulo="Data e hora">
            {ag.dataHora ? format(new Date(ag.dataHora), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR }) : '—'}
          </Linha>
          <Linha rotulo="Cliente">{ag.clienteNome ?? '—'}</Linha>
          <Linha rotulo="Veículo">{ag.veiculoPlaca ?? '—'}</Linha>
          <Linha rotulo="Serviços">{servicosTexto(ag)}</Linha>
          {item.orcamento && (
            <Linha rotulo="Orçamento">
              {permissoes.lerOrcamento ? (
                <Link to={`/orcamentos/${item.orcamento.id}`} className="text-brand-700 underline underline-offset-2 dark:text-brand-300">
                  #{item.orcamento.id}
                </Link>
              ) : (
                <>#{item.orcamento.id}</>
              )}
            </Linha>
          )}
          <Linha rotulo="Mecânico">{os?.usuarioResponsavelNome ?? 'Não definido'}</Linha>
          {os && (
            <Linha rotulo="Ordem de serviço">
              <Link to={`/ordens-servico/${os.id}`} className="text-brand-700 underline underline-offset-2 dark:text-brand-300">
                {os.numero}
              </Link>{' '}
              <Badge tone={metaFor(ordemServicoStatusMeta, os.status).tone}>{metaFor(ordemServicoStatusMeta, os.status).label}</Badge>
            </Linha>
          )}
          {ag.observacoes && <Linha rotulo="Observações">{ag.observacoes}</Linha>}
          <p className="flex items-start gap-2 rounded-lg bg-surface-alt p-2.5 text-xs text-ink-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden />
            {item.vinculo === 'veiculo'
              ? 'OS associada pelo veículo (este agendamento não tem orçamento vinculado). '
              : ''}
            O andamento (iniciar, aguardar peças, concluir) é registrado pelo técnico na ordem de serviço e reflete aqui automaticamente.
          </p>
        </dl>
      )}
    </Modal>
  );
}
