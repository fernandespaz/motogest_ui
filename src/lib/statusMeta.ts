type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/**
 * Every status across the app boils down to one of these meanings. Domain maps below
 * only decide which meaning a given status has — the tone itself is decided once,
 * here, so "Aberta" (OS) and "Rascunho" (orçamento) read with the same color language
 * instead of drifting apart module by module.
 */
type Semantic = 'aguardando' | 'andamento' | 'concluido' | 'cancelado' | 'neutro';

const semanticTone: Record<Semantic, Tone> = {
  aguardando: 'brand', // aguardando ação de terceiro (cliente, fornecedor, início do trabalho)
  andamento: 'warning', // em execução ou bloqueado precisando de atenção
  concluido: 'success', // finalizado com sucesso
  cancelado: 'danger', // cancelado, rejeitado, atrasado ou expirado
  neutro: 'neutral', // encerrado sem carga positiva/negativa
};

function meta(label: string, semantic: Semantic) {
  return { label, tone: semanticTone[semantic] };
}

export const agendamentoStatusMeta: Record<string, { label: string; tone: Tone }> = {
  AGENDADO: meta('Agendado', 'aguardando'),
  CONFIRMADO: meta('Confirmado', 'aguardando'),
  EM_ANDAMENTO: meta('Em andamento', 'andamento'),
  CONCLUIDO: meta('Concluído', 'concluido'),
  CANCELADO: meta('Cancelado', 'cancelado'),
};

export const orcamentoStatusMeta: Record<string, { label: string; tone: Tone }> = {
  RASCUNHO: meta('Rascunho', 'aguardando'),
  ENVIADO: meta('Aguardando aprovação', 'aguardando'),
  APROVADO: meta('Aprovado', 'concluido'),
  REJEITADO: meta('Rejeitado', 'cancelado'),
  EXPIRADO: meta('Expirado', 'cancelado'),
  CONVERTIDO: meta('Convertido em OS', 'concluido'),
};

export const ordemServicoStatusMeta: Record<string, { label: string; tone: Tone }> = {
  ABERTA: meta('Aberta', 'aguardando'),
  EM_ANDAMENTO: meta('Em andamento', 'andamento'),
  AGUARDANDO_PECA: meta('Aguardando peça', 'andamento'),
  CONCLUIDA: meta('Concluída', 'concluido'),
  CANCELADA: meta('Cancelada', 'cancelado'),
  ENTREGUE: meta('Entregue', 'concluido'),
};

export const contaStatusMeta: Record<string, { label: string; tone: Tone }> = {
  PENDENTE: meta('Pendente', 'aguardando'),
  PAGO: meta('Pago', 'concluido'),
  RECEBIDO: meta('Recebido', 'concluido'),
  ATRASADO: meta('Atrasado', 'cancelado'),
  CANCELADO: meta('Cancelado', 'neutro'),
};

export const licencaStatusMeta: Record<string, { label: string; tone: Tone }> = {
  TRIAL: meta('Período de teste', 'aguardando'),
  ATIVA: meta('Ativa', 'concluido'),
  EXPIRADA: meta('Expirada', 'cancelado'),
  CANCELADA: meta('Cancelada', 'neutro'),
};

export const checklistSituacaoMeta: Record<string, { label: string; tone: Tone }> = {
  OK: meta('OK', 'concluido'),
  ATENCAO: meta('Atenção', 'andamento'),
  DEFEITO: meta('Defeito', 'cancelado'),
  NAO_APLICAVEL: meta('Não aplicável', 'neutro'),
};

export function metaFor(map: Record<string, { label: string; tone: Tone }>, status?: string) {
  if (!status) return { label: '—', tone: 'neutral' as Tone };
  return map[status] ?? { label: status, tone: 'neutral' as Tone };
}
