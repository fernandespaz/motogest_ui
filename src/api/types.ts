import type { components } from './schema.d.ts';

export type Schemas = components['schemas'];

export type LoginRequest = Schemas['LoginRequest'];
export type LoginResponse = Schemas['LoginResponse'];

export type ClienteRequest = Schemas['ClienteRequest'];
export type ClienteResponse = Schemas['ClienteResponse'];
export type TipoPessoa = NonNullable<ClienteRequest['tipoPessoa']>;

export type VeiculoRequest = Schemas['VeiculoRequest'];
export type VeiculoResponse = Schemas['VeiculoResponse'];

export type AgendamentoRequest = Schemas['AgendamentoRequest'];
export type AgendamentoResponse = Schemas['AgendamentoResponse'];
export type AgendamentoServicoResponse = Schemas['AgendamentoServicoResponse'];
export type AgendamentoStatus = NonNullable<AgendamentoRequest['status']>;

export type OrcamentoRequest = Schemas['OrcamentoRequest'];
export type OrcamentoResponse = Schemas['OrcamentoResponse'];
export type OrcamentoStatus = NonNullable<OrcamentoResponse['status']>;

export type ItemRequest = Schemas['ItemRequest'];
export type ItemResponse = Schemas['ItemResponse'];
export type TipoItem = NonNullable<ItemRequest['tipoItem']>;

export type OrdemServicoRequest = Schemas['OrdemServicoRequest'];
export type OrdemServicoResponse = Schemas['OrdemServicoResponse'];
export type OrdemServicoStatus = NonNullable<OrdemServicoResponse['status']>;

export type ProdutoRequest = Schemas['ProdutoRequest'];
export type ProdutoResponse = Schemas['ProdutoResponse'];

export type ServicoRequest = Schemas['ServicoRequest'];
export type ServicoResponse = Schemas['ServicoResponse'];

export type CaixaMovimentoRequest = Schemas['CaixaMovimentoRequest'];
export type CaixaMovimentoResponse = Schemas['CaixaMovimentoResponse'];
export type CaixaTipo = NonNullable<CaixaMovimentoRequest['tipo']>;
export type CaixaCategoria = NonNullable<CaixaMovimentoRequest['categoria']>;

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

export type PerfilRequest = Schemas['PerfilRequest'];
export type PerfilResponse = Schemas['PerfilResponse'];
export type PermissaoResponse = Schemas['PermissaoResponse'];

export type UsuarioRequest = Schemas['UsuarioRequest'];
export type UsuarioResponse = Schemas['UsuarioResponse'];

export type OficinaResponse = Schemas['OficinaResponse'];
export type OficinaRegistrationRequest = Schemas['OficinaRegistrationRequest'];
export type OficinaUpdateRequest = Schemas['OficinaUpdateRequest'];

export type LicencaResponse = Schemas['LicencaResponse'];
export type UpgradeLicencaRequest = Schemas['UpgradeLicencaRequest'];
export type LicencaStatus = NonNullable<LicencaResponse['status']>;

export type DashboardResponse = Schemas['DashboardResponse'];
export type ResumoContasResponse = Schemas['ResumoContasResponse'];

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
