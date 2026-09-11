type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

export const agendamentoStatusMeta: Record<string, { label: string; tone: Tone }> = {
  AGENDADO: { label: 'Agendado', tone: 'brand' },
  CONFIRMADO: { label: 'Confirmado', tone: 'brand' },
  EM_ANDAMENTO: { label: 'Em andamento', tone: 'warning' },
  CONCLUIDO: { label: 'Concluído', tone: 'success' },
  CANCELADO: { label: 'Cancelado', tone: 'danger' },
};

export const orcamentoStatusMeta: Record<string, { label: string; tone: Tone }> = {
  RASCUNHO: { label: 'Rascunho', tone: 'neutral' },
  ENVIADO: { label: 'Enviado', tone: 'brand' },
  APROVADO: { label: 'Aprovado', tone: 'success' },
  REJEITADO: { label: 'Rejeitado', tone: 'danger' },
  EXPIRADO: { label: 'Expirado', tone: 'warning' },
  CONVERTIDO: { label: 'Convertido em OS', tone: 'success' },
};

export const ordemServicoStatusMeta: Record<string, { label: string; tone: Tone }> = {
  ABERTA: { label: 'Aberta', tone: 'brand' },
  EM_ANDAMENTO: { label: 'Em andamento', tone: 'warning' },
  AGUARDANDO_PECA: { label: 'Aguardando peça', tone: 'warning' },
  CONCLUIDA: { label: 'Concluída', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
  ENTREGUE: { label: 'Entregue', tone: 'success' },
};

export const contaStatusMeta: Record<string, { label: string; tone: Tone }> = {
  PENDENTE: { label: 'Pendente', tone: 'warning' },
  PAGO: { label: 'Pago', tone: 'success' },
  RECEBIDO: { label: 'Recebido', tone: 'success' },
  ATRASADO: { label: 'Atrasado', tone: 'danger' },
  CANCELADO: { label: 'Cancelado', tone: 'neutral' },
};

export const licencaStatusMeta: Record<string, { label: string; tone: Tone }> = {
  TRIAL: { label: 'Período de teste', tone: 'brand' },
  ATIVA: { label: 'Ativa', tone: 'success' },
  EXPIRADA: { label: 'Expirada', tone: 'danger' },
  CANCELADA: { label: 'Cancelada', tone: 'neutral' },
};

export const checklistSituacaoMeta: Record<string, { label: string; tone: Tone }> = {
  OK: { label: 'OK', tone: 'success' },
  ATENCAO: { label: 'Atenção', tone: 'warning' },
  DEFEITO: { label: 'Defeito', tone: 'danger' },
  NAO_APLICAVEL: { label: 'Não aplicável', tone: 'neutral' },
};

export function metaFor(map: Record<string, { label: string; tone: Tone }>, status?: string) {
  if (!status) return { label: '—', tone: 'neutral' as Tone };
  return map[status] ?? { label: status, tone: 'neutral' as Tone };
}
