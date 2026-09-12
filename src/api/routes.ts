/**
 * Single source of truth for every backend path the app calls.
 * Endpoint modules (src/api/endpoints/*) must build requests from these
 * entries instead of inlining path strings, so a backend contract change
 * only ever touches one file.
 */
export const API_ROUTES = {
  auth: {
    login: '/api/v1/auth/login',
  },
  clientes: {
    base: '/api/v1/clientes',
  },
  veiculos: {
    base: '/api/v1/veiculos',
  },
  agenda: {
    base: '/api/v1/agendamentos',
    periodo: '/api/v1/agendamentos/periodo',
    status: (id: number) => `/api/v1/agendamentos/${id}/status`,
  },
  orcamentos: {
    base: '/api/v1/orcamentos',
    enviar: (id: number) => `/api/v1/orcamentos/${id}/enviar`,
    aprovar: (id: number) => `/api/v1/orcamentos/${id}/aprovar`,
    rejeitar: (id: number) => `/api/v1/orcamentos/${id}/rejeitar`,
  },
  orcamentosPublico: {
    buscar: (token: string) => `/api/v1/public/orcamentos/${token}`,
    aprovar: (token: string) => `/api/v1/public/orcamentos/${token}/aprovar`,
    rejeitar: (token: string) => `/api/v1/public/orcamentos/${token}/rejeitar`,
  },
  ordensServico: {
    base: '/api/v1/ordens-servico',
    aPartirDeOrcamento: (orcamentoId: number) => `/api/v1/ordens-servico/a-partir-de-orcamento/${orcamentoId}`,
    status: (id: number) => `/api/v1/ordens-servico/${id}/status`,
  },
  produtos: {
    base: '/api/v1/produtos',
    abaixoDoMinimo: '/api/v1/produtos/abaixo-do-minimo',
  },
  estoque: {
    base: '/api/v1/movimentacoes-estoque',
    porProduto: (produtoId: number) => `/api/v1/produtos/${produtoId}/movimentacoes`,
  },
  servicos: {
    base: '/api/v1/servicos',
  },
  caixa: {
    movimentos: '/api/v1/caixa/movimentos',
    periodo: '/api/v1/caixa/movimentos/periodo',
    saldo: '/api/v1/caixa/saldo',
  },
  contasPagar: {
    base: '/api/v1/contas-pagar',
    pendentes: '/api/v1/contas-pagar/pendentes',
    pagar: (id: number) => `/api/v1/contas-pagar/${id}/pagar`,
    cancelar: (id: number) => `/api/v1/contas-pagar/${id}/cancelar`,
  },
  contasReceber: {
    base: '/api/v1/contas-receber',
    pendentes: '/api/v1/contas-receber/pendentes',
    receber: (id: number) => `/api/v1/contas-receber/${id}/receber`,
    cancelar: (id: number) => `/api/v1/contas-receber/${id}/cancelar`,
  },
  checklists: {
    base: (ordemServicoId: number) => `/api/v1/ordens-servico/${ordemServicoId}/checklists`,
  },
  fotos: {
    base: (ordemServicoId: number) => `/api/v1/ordens-servico/${ordemServicoId}/fotos`,
    remover: (id: number) => `/api/v1/fotos/${id}`,
  },
  perfis: {
    base: '/api/v1/perfis',
    permissoesDisponiveis: '/api/v1/perfis/permissoes-disponiveis',
  },
  usuarios: {
    base: '/api/v1/usuarios',
  },
  oficinas: {
    atual: '/api/v1/oficinas/atual',
    // Público (POST /oficinas/registrar) foi removido pelo backend — cadastro de
    // oficina agora é exclusivo do time root, via admin.base (X-Admin-Token).
    admin: '/api/v1/admin/oficinas',
  },
  licenca: {
    atual: '/api/v1/licenca/atual',
    upgrade: '/api/v1/licenca/upgrade',
  },
  dashboard: {
    base: '/api/v1/dashboard',
  },
} as const;
