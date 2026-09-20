export type PlanoCodigo = 'BASICO' | 'PRO' | 'PREMIUM';

export interface PlanoConfig {
  label: string;
  descricao: string;
  valorMensal: number;
  valorAvulso: number;
  recursos: string[];
  /** Recursos planejados para o plano, ainda não implementados — exibidos como "em breve" para não prometer o que não roda. */
  emBreve?: string[];
  recomendado?: boolean;
}

// Valores confirmados com o time de negócio em 2026-09-20. Estratégia de
// entrada no mercado: ~15% abaixo da faixa praticada por concorrentes de
// nicho (gestão de oficina mecânica) no Brasil. O pedido avulso é cobrado
// acima da assinatura equivalente de propósito — é o preço da flexibilidade
// de não renovar automaticamente, não uma penalidade.
export const PLANOS: Record<PlanoCodigo, PlanoConfig> = {
  BASICO: {
    label: 'Básico',
    descricao:
      'Para quem está organizando a oficina agora e ainda não precisa de uma equipe grande nem de visão gerencial.',
    valorMensal: 74.9,
    valorAvulso: 94.9,
    recursos: [
      'Até 2 usuários com login próprio',
      'Ordens de serviço e orçamentos ilimitados',
      'Cadastro de clientes e veículos, com fotos',
      'Painel com status das ordens de serviço',
    ],
  },
  PRO: {
    label: 'Pro',
    descricao: 'Para oficinas com equipe rodando, que precisam de controle de estoque e visão real de faturamento.',
    valorMensal: 149.9,
    valorAvulso: 189.9,
    recomendado: true,
    recursos: [
      'Tudo do Básico',
      'Até 6 usuários com perfis de permissão próprios',
      'Controle de estoque com reserva por ordem de serviço',
      'Relatórios de faturamento, produtividade por mecânico e ticket médio',
      'Alertas de retorno de cliente e revisão preventiva',
      'Marca própria (logo) nos PDFs de orçamento e OS',
    ],
  },
  PREMIUM: {
    label: 'Premium',
    descricao: 'Para redes com mais de uma unidade e operação madura que precisa de suporte prioritário.',
    valorMensal: 249.9,
    valorAvulso: 319.9,
    recursos: ['Tudo do Pro', 'Usuários ilimitados', 'Exportação de relatórios para o contador', 'Suporte prioritário via WhatsApp'],
    emBreve: ['Múltiplas unidades/filiais na mesma conta', 'Emissão de NFS-e integrada'],
  },
};
