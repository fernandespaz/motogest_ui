import type { components } from './schema.d.ts';

export type Schemas = components['schemas'];

export type LoginRequest = Schemas['LoginRequest'];
export type LoginResponse = Schemas['LoginResponse'];

export type ClienteRequest = Schemas['ClienteRequest'];
export type ClienteResponse = Schemas['ClienteResponse'];
export type TipoPessoa = NonNullable<ClienteRequest['tipoPessoa']>;

export type VeiculoRequest = Schemas['VeiculoRequest'];
export type VeiculoResponse = Schemas['VeiculoResponse'];
export type VeiculoDoClienteRequest = Schemas['VeiculoDoClienteRequest'];

export type ModeloVeiculoResponse = Schemas['ModeloVeiculoResponse'];
// Sem schema JSON próprio no OpenAPI — marca/modelo vão por query string e o
// arquivo por multipart (ver POST/PUT /modelos-veiculo), não como corpo JSON.
export interface ModeloVeiculoRequest {
  marca: string;
  modelo: string;
  arquivo?: File;
}

export type AgendamentoRequest = Schemas['AgendamentoRequest'];
export type AgendamentoResponse = Schemas['AgendamentoResponse'];
export type AgendamentoServicoResponse = Schemas['AgendamentoServicoResponse'];
export type AgendamentoStatus = NonNullable<AgendamentoRequest['status']>;

export type OrcamentoRequest = Schemas['OrcamentoRequest'];
export type OrcamentoResponse = Schemas['OrcamentoResponse'];
export type OrcamentoStatus = NonNullable<OrcamentoResponse['status']>;
export type OrcamentoPublicoResponse = Schemas['OrcamentoPublicoResponse'];

export type ItemRequest = Schemas['ItemRequest'];
export type ItemResponse = Schemas['ItemResponse'];
export type TipoItem = NonNullable<ItemRequest['tipoItem']>;

export type OrdemServicoRequest = Schemas['OrdemServicoRequest'];
/**
 * ATENÇÃO — divergência temporária do contrato ao vivo (27/09/2026): o
 * backend fez um rollback/branch trocada que removeu `status: "FATURADO"`,
 * `clienteDocumento` e `dataFaturamento` de OrdemServicoResponse (junto com
 * todo o módulo de sessões de caixa — ver CaixaSessaoResponse etc. abaixo).
 * Isso é declarado à mão aqui, por cima do gerado, só pra manter o código de
 * Faturar no Caixa/FATURADO compilando enquanto o time de backend confirma se
 * foi acidental. Assim que o schema.d.ts gerado voltar a ter esses campos,
 * troque de volta pra `Schemas['OrdemServicoResponse']` puro.
 */
export type OrdemServicoResponse = Omit<Schemas['OrdemServicoResponse'], 'status'> & {
  status?: NonNullable<Schemas['OrdemServicoResponse']['status']> | 'FATURADO';
  clienteDocumento?: string;
  /** Format: date-time */
  dataFaturamento?: string;
};
export type OrdemServicoStatus = NonNullable<OrdemServicoResponse['status']>;
export type OrdemServicoPublicoResponse = Schemas['OrdemServicoPublicoResponse'];
export type OrdemServicoPausaResponse = Schemas['OrdemServicoPausaResponse'];
export type PausarOrdemServicoRequest = Schemas['PausarOrdemServicoRequest'];

export type ProdutoRequest = Schemas['ProdutoRequest'];
export type ProdutoResponse = Schemas['ProdutoResponse'];
export type ProdutoImagemResponse = Schemas['ProdutoImagemResponse'];
export type ProdutoCategoria = NonNullable<ProdutoRequest['categoria']>;

export type ServicoRequest = Schemas['ServicoRequest'];
export type ServicoResponse = Schemas['ServicoResponse'];

/**
 * ATENÇÃO — divergência temporária do contrato ao vivo (27/09/2026): o
 * backend removeu por completo o módulo de sessões de caixa/faturamento
 * (`/caixa/sessoes/*`, `/caixa/faturamento/*`, `/caixa/relatorios/*`) e
 * reverteu CaixaMovimentoResponse/Request pro formato antigo, sem
 * `formaPagamento`/`caixaSessaoId`/`caixaSessaoIdentificador`. Provavelmente
 * um rollback acidental (branch trocada) — aguardando confirmação do time de
 * backend. Todos os tipos abaixo ficam declarados à mão (não mais derivados
 * de `Schemas[...]`, que não os tem mais) só pra manter as telas de Meu
 * Caixa/Faturar OS/relatórios compilando enquanto isso não se resolve. Assim
 * que os endpoints voltarem, troque de volta pra `Schemas['...']` puro.
 */
export type CaixaMovimentoRequest = Schemas['CaixaMovimentoRequest'] & {
  formaPagamento?: 'DINHEIRO' | 'CARTAO' | 'PIX' | 'TRANSFERENCIA';
};
export type CaixaMovimentoResponse = Schemas['CaixaMovimentoResponse'] & {
  formaPagamento?: 'DINHEIRO' | 'CARTAO' | 'PIX' | 'TRANSFERENCIA';
  caixaSessaoId?: number;
  caixaSessaoIdentificador?: string;
};
export type CaixaTipo = NonNullable<CaixaMovimentoRequest['tipo']>;
export type CaixaCategoria = NonNullable<CaixaMovimentoRequest['categoria']>;
export type FormaPagamento = NonNullable<CaixaMovimentoRequest['formaPagamento']>;

export interface SaldoPorFormaPagamentoResponse {
  dinheiro?: number;
  cartao?: number;
  pix?: number;
  transferencia?: number;
  total?: number;
}

export type CaixaSessaoStatus = 'ABERTO' | 'FECHADO';

export interface CaixaSessaoResponse {
  id?: number;
  identificador?: string;
  turno?: string;
  status?: CaixaSessaoStatus;
  abertoPorUsuarioId?: number;
  abertoPorUsuarioNome?: string;
  abertoEm?: string;
  saldoInicial?: SaldoPorFormaPagamentoResponse;
  totalEntradas?: SaldoPorFormaPagamentoResponse;
  totalSaidas?: SaldoPorFormaPagamentoResponse;
  saldoAtual?: SaldoPorFormaPagamentoResponse;
  fechadoPorUsuarioId?: number;
  fechadoPorUsuarioNome?: string;
  fechadoEm?: string;
  saldoFinalInformado?: SaldoPorFormaPagamentoResponse;
  saldoFinalCalculado?: SaldoPorFormaPagamentoResponse;
  divergencia?: SaldoPorFormaPagamentoResponse;
  observacaoFechamento?: string;
  justificativaDivergencia?: string;
}

export interface CaixaSessaoAberturaRequest {
  turno?: string;
  saldoInicialDinheiro?: number;
  saldoInicialCartao?: number;
  saldoInicialPix?: number;
  saldoInicialTransferencia?: number;
}

export interface CaixaSessaoFechamentoRequest {
  saldoFinalInformadoDinheiro: number;
  saldoFinalInformadoCartao: number;
  saldoFinalInformadoPix: number;
  saldoFinalInformadoTransferencia: number;
  observacao?: string;
  justificativaDivergencia?: string;
}

export interface CaixaSessaoReaberturaRequest {
  motivo: string;
}

export type CaixaSessaoEventoTipo = 'ABERTURA' | 'FECHAMENTO' | 'REABERTURA';

export interface CaixaSessaoEventoResponse {
  id?: number;
  tipo?: CaixaSessaoEventoTipo;
  usuarioId?: number;
  usuarioNome?: string;
  ocorridoEm?: string;
  observacao?: string;
}

export interface FaturamentoOrdemServicoRequest {
  formaPagamento: FormaPagamento;
}

export interface FaturamentoOrdemServicoResponse {
  ordemServicoId?: number;
  ordemServicoNumero?: string;
  clienteId?: number;
  clienteNome?: string;
  valor?: number;
  formaPagamento?: FormaPagamento;
  contaReceberId?: number;
  caixaMovimentoId?: number;
  caixaSessaoIdentificador?: string;
  recebidoEm?: string;
}

export interface PontoDiarioCaixaResponse {
  data?: string;
  totalEntradas?: number;
  totalSaidas?: number;
  saldoDia?: number;
}

export interface RelatorioCaixaDiarioResponse {
  data?: string;
  totalEntradas?: number;
  totalSaidas?: number;
  saldoDia?: number;
  movimentos?: CaixaMovimentoResponse[];
  sessoes?: CaixaSessaoResponse[];
}

export interface RelatorioCaixaPeriodoResponse {
  inicio?: string;
  fim?: string;
  totalEntradas?: number;
  totalSaidas?: number;
  saldoPeriodo?: number;
  diaDePicoDeEntrada?: string;
  diaDePicoDeSaida?: string;
  pontosDiarios?: PontoDiarioCaixaResponse[];
}

export type FormatoExportacaoCaixa = 'PDF' | 'XLSX';

export type ContaPagarRequest = Schemas['ContaPagarRequest'];
export type ContaPagarResponse = Schemas['ContaPagarResponse'];
export type ContaReceberRequest = Schemas['ContaReceberRequest'];
export type ContaReceberResponse = Schemas['ContaReceberResponse'];
export type StatusConta = NonNullable<ContaPagarResponse['status']>;

export type ChecklistRequest = Schemas['ChecklistRequest'];
export type ChecklistResponse = Schemas['ChecklistResponse'];
export type ChecklistItemRequest = Schemas['ChecklistItemRequest'];
export type ChecklistItemResponse = Schemas['ChecklistItemResponse'];
export type ChecklistTipo = NonNullable<ChecklistRequest['tipo']>;
export type ChecklistSituacao = NonNullable<ChecklistItemRequest['situacao']>;

export type FotoRequest = Schemas['FotoRequest'];
export type FotoResponse = Schemas['FotoResponse'];
export type FotoTipo = NonNullable<FotoRequest['tipo']>;

export type MovimentacaoEstoqueRequest = Schemas['MovimentacaoEstoqueRequest'];
export type MovimentacaoEstoqueResponse = Schemas['MovimentacaoEstoqueResponse'];
export type MovimentacaoTipo = NonNullable<MovimentacaoEstoqueRequest['tipo']>;

export type ReservarEstoqueRequest = Schemas['ReservarEstoqueRequest'];
export type ReservaEstoqueResponse = Schemas['ReservaEstoqueResponse'];
export type ReservaEstoqueStatus = NonNullable<ReservaEstoqueResponse['status']>;

export type SolicitacaoDescontoRequest = Schemas['SolicitacaoDescontoRequest'];
export type SolicitacaoDescontoResponse = Schemas['SolicitacaoDescontoResponse'];
export type RejeitarSolicitacaoDescontoRequest = Schemas['RejeitarSolicitacaoDescontoRequest'];
export type OrigemDesconto = NonNullable<SolicitacaoDescontoRequest['origemTipo']>;
export type StatusDesconto = NonNullable<SolicitacaoDescontoResponse['status']>;

export type PerfilRequest = Schemas['PerfilRequest'];
export type PerfilResponse = Schemas['PerfilResponse'];
export type PermissaoResponse = Schemas['PermissaoResponse'];

// `confirmacaoSenha` / `adminConfirmacaoSenha` existem no backend (motogest_api),
// mas o /v3/api-docs rodando ainda não os expõe; remover os intersections
// após o próximo `gen:api` que os inclua.
export type UsuarioRequest = Schemas['UsuarioRequest'] & { confirmacaoSenha?: string };
export type UsuarioResponse = Schemas['UsuarioResponse'];

// ATENÇÃO — mesma divergência temporária citada acima: o backend também
// removeu `logoUrl` de OficinaResponse (só sobrou `logoImagemDisponivel`).
// Ver features/shared/pdf/logo.ts e hooks/useOficina.ts, que dependem dele
// pra logo externa (URL, não upload).
export type OficinaResponse = Schemas['OficinaResponse'] & { logoUrl?: string };
export type OficinaRegistrationRequest = Schemas['OficinaRegistrationRequest'] & {
  adminConfirmacaoSenha?: string;
};
export type OficinaUpdateRequest = Schemas['OficinaUpdateRequest'];
export type AdminOficinaResponse = Schemas['AdminOficinaResponse'];

export type LicencaResponse = Schemas['LicencaResponse'];
export type LicencaStatus = NonNullable<LicencaResponse['status']>;

export type IniciarPedidoRequest = Schemas['IniciarPedidoRequest'];
export type IniciarAssinaturaRequest = Schemas['IniciarAssinaturaRequest'];
export type IniciarPixRequest = Schemas['IniciarPixRequest'];
export type PagamentoResponse = Schemas['PagamentoResponse'];
export type ChavePublicaResponse = Schemas['ChavePublicaResponse'];
export type PagamentoStatus = NonNullable<PagamentoResponse['status']>;
export type PagamentoTipo = NonNullable<PagamentoResponse['tipo']>;

export type DashboardResponse = Schemas['DashboardResponse'];
export type ResumoContasResponse = Schemas['ResumoContasResponse'];

// Precificação por categoria de serviço (27/09/2026) — substituiu por
// completo o modelo antigo de PHT único calculado a partir de custos fixos.
export type CategoriaServico = Schemas['ServicoRequest']['categoria'];
// Atualização 29/09: a categoria que decide o preço passou a viver no
// Veículo, não mais no Serviço (que agora só carrega uma categoria de
// referência/sugestão) — ver Schemas['VeiculoRequest']['categoria']. Mesma
// escala "A"|"B"|"C" nos dois, por isso um tipo único em vez de duplicar.
export type CategoriaComplexidade = NonNullable<Schemas['VeiculoRequest']['categoria']>;
export type CategoriaHoraTecnicaItemRequest = Schemas['CategoriaHoraTecnicaItemRequest'];
export type CategoriaHoraTecnicaRequest = Schemas['CategoriaHoraTecnicaRequest'];
export type CategoriaHoraTecnicaResponse = Schemas['CategoriaHoraTecnicaResponse'];

export type CapacidadeProdutivaRequest = Schemas['CapacidadeProdutivaRequest'];
export type CapacidadeProdutivaResponse = Schemas['CapacidadeProdutivaResponse'];

export type AuditoriaParametroFinanceiroResponse = Schemas['AuditoriaParametroFinanceiroResponse'];
export type AcaoAuditoria = NonNullable<AuditoriaParametroFinanceiroResponse['acao']>;

export type IndicadoresConsultorResponse = Schemas['IndicadoresConsultorResponse'];
export type ProdutividadeConsultorResponse = Schemas['ProdutividadeConsultorResponse'];
export type ProdutividadeConsultoresResponse = Schemas['ProdutividadeConsultoresResponse'];
export type ProdutividadeConsultorDetalheResponse = Schemas['ProdutividadeConsultorDetalheResponse'];
export type OrcamentoEmitido = Schemas['OrcamentoEmitido'];
export type ServicoFechado = Schemas['ServicoFechado'];

export type IndicadoresProdutividadeResponse = Schemas['IndicadoresProdutividadeResponse'];
export type ProdutividadeMecanicoResponse = Schemas['ProdutividadeMecanicoResponse'];
export type ProdutividadeOficinaResponse = Schemas['ProdutividadeOficinaResponse'];
export type ProdutividadeMecanicoDetalheResponse = Schemas['ProdutividadeMecanicoDetalheResponse'];
export type OrdemServicoProdutividadeResponse = Schemas['OrdemServicoProdutividadeResponse'];
export type ProdutividadeDiariaResponse = Schemas['ProdutividadeDiariaResponse'];

export type ConfiguracaoFiscalRequest = Schemas['ConfiguracaoFiscalRequest'];
export type ConfiguracaoFiscalResponse = Schemas['ConfiguracaoFiscalResponse'];
export type CertificadoFiscalResponse = Schemas['CertificadoFiscalResponse'];
export type RegimeTributarioResponse = Schemas['RegimeTributarioResponse'];
export type CancelamentoNfseRequest = Schemas['CancelamentoNfseRequest'];
export type NfseResponse = Schemas['DocumentoFiscalResponse'];
export type NfseEventoResponse = Schemas['DocumentoFiscalEventoResponse'];
export type RegimeTributario = NonNullable<ConfiguracaoFiscalRequest['regimeTributario']>;
export type AmbienteFiscal = ConfiguracaoFiscalRequest['ambiente'];
export type StatusNfse = NonNullable<NfseResponse['status']>;

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
}
