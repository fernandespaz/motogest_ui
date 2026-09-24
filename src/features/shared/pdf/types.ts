/**
 * Everything the OS/Orçamento PDF template needs to render, already resolved to
 * plain strings/numbers by the caller (OrcamentoResponse or OrdemServicoResponse,
 * merged with the full Cliente/Veiculo/Oficina records). The renderer in
 * osDocumentPdf.ts never talks to the API or knows about Orçamento vs OS —
 * it only lays out this shape on the page.
 */
export interface OSDocumentLogo {
  dataUrl: string;
  largura: number;
  altura: number;
}

export interface OSDocumentLineItem {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface OSDocumentData {
  /** "Orçamento" or "Ordem de Serviço" — printed as the document title. */
  tipoDocumento: string;
  /** e.g. "ORÇ-12" or the OS's own número (OS-000001). */
  numero: string;
  status: string;
  dataEmissao: string;
  /** Só Orçamento: data-limite da proposta ("dd/mm/aaaa"). */
  validade?: string;

  oficina: {
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    telefone?: string;
    /** Endereço completo numa linha — omitido quando o perfil só recebe a oficina resumida. */
    endereco?: string;
    /** Telefone · e-mail numa linha — idem. */
    contato?: string;
    /** Logo já carregada como PNG base64 — o renderer só desenha, nunca busca. */
    logo?: OSDocumentLogo;
  };

  cliente: {
    nome: string;
    documento: string;
    tipoPessoa: 'PF' | 'PJ';
    endereco: string;
    bairroCidadeUf: string;
    cep?: string;
    telefone?: string;
    email?: string;
  };

  veiculo: {
    descricao: string; // "Volkswagen Gol 1.6"
    placa: string;
    chassi?: string;
    anoFabricacaoModelo?: string; // "2022/2023"
    cor?: string;
    kmAtual?: string;
  };

  /** Consultor responsável — impresso no topo. Orçamento e OS têm os dois. */
  consultor?: string;
  /** Só Ordem de Serviço: o mecânico que executou (não confundir com consultor acima). */
  tecnicoResponsavel?: string;
  /** Daqui pra baixo, só presente em Ordens de Serviço — Orçamentos deixam undefined. */
  previsaoEntrega?: string;
  dataAbertura?: string;
  dataConclusao?: string;

  /** Free-text account of what the client reported, or what the consultant relayed. */
  solicitacaoCliente?: string;

  servicos: OSDocumentLineItem[];
  pecas: OSDocumentLineItem[];
  totalServicos: number;
  totalPecas: number;
  totalGeral: number;

  observacoes?: string;
}
