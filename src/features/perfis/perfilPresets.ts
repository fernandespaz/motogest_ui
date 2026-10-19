/**
 * Starting points for the permission checklist in PerfilFormModal — matches the
 * profile matrix from the UX review (Admin / Operacional / Consultor). These are
 * just a head start: every checkbox stays editable after applying one.
 */
export type PerfilPresetKey = 'OPERACIONAL' | 'CONSULTOR' | 'CAIXA' | 'ADMIN';

export const PERFIL_PRESETS: Record<PerfilPresetKey, { label: string; permissoes: string[] }> = {
  OPERACIONAL: {
    label: 'Operacional — foco em OS',
    permissoes: [
      'CLIENTE_READ',
      'VEICULO_READ',
      'ORDEM_SERVICO_READ',
      'ORDEM_SERVICO_WRITE',
      'CHECKLIST_WRITE',
      'FOTO_WRITE',
      'ESTOQUE_READ',
    ],
  },
  CONSULTOR: {
    label: 'Consultor — orçamento e agenda',
    permissoes: [
      'CLIENTE_READ',
      'CLIENTE_WRITE',
      'VEICULO_READ',
      'VEICULO_WRITE',
      'AGENDA_READ',
      'AGENDA_WRITE',
      'SERVICO_READ',
      'ORCAMENTO_READ',
      'ORCAMENTO_WRITE',
      'ORDEM_SERVICO_READ',
      'ORDEM_SERVICO_WRITE',
      'ESTOQUE_READ',
      'ESTOQUE_WRITE',
    ],
  },
  // Operador de caixa: abre/fecha turno e lança (CAIXA_OPERAR), fatura OS (ORDEM_SERVICO_READ/CLIENTE_READ/VEICULO_READ pra achá-la)
  // e vende peças do estoque — que no backend exige ESTOQUE_WRITE (movimentação de saída). Sem FINANCEIRO_*: contas e relatórios
  // administrativos ficam fora; quem precisar baixar contas pelo caixa ganha FINANCEIRO_READ + FINANCEIRO_WRITE.
  CAIXA: {
    label: 'Caixa — operação do turno e venda de peças',
    permissoes: [
      'CAIXA_OPERAR',
      'CLIENTE_READ',
      'VEICULO_READ',
      'ORDEM_SERVICO_READ',
      'ESTOQUE_READ',
      'ESTOQUE_WRITE',
    ],
  },
  ADMIN: {
    label: 'Administrador — acesso total',
    permissoes: [], // resolved dynamically from the full permission catalog, see applyPreset()
  },
};
