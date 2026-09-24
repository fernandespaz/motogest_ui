/**
 * O backend não devolve uma categoria junto da permissão (só id/codigo/
 * descricao) — esse agrupamento é só de UI, pra organizar o checklist do
 * PerfilFormModal em vez de uma lista única de ~30 itens. Deriva a categoria
 * do prefixo do recurso no código (ex.: "ORDEM_SERVICO" de "ORDEM_SERVICO_WRITE").
 */
export type PermissaoCategoria = 'GERENCIAL' | 'COMERCIAL' | 'TECNICO' | 'OUTROS';

export const PERMISSAO_CATEGORIA_LABELS: Record<PermissaoCategoria, string> = {
  GERENCIAL: 'Gerencial',
  COMERCIAL: 'Comercial',
  TECNICO: 'Técnico',
  OUTROS: 'Outros',
};

/** Ordem de exibição das seções no formulário de perfil. */
export const PERMISSAO_CATEGORIA_ORDEM: PermissaoCategoria[] = ['GERENCIAL', 'COMERCIAL', 'TECNICO', 'OUTROS'];

const RECURSOS_POR_CATEGORIA: Record<Exclude<PermissaoCategoria, 'OUTROS'>, string[]> = {
  // Administração da oficina em si — não do atendimento ao cliente nem da
  // execução do serviço.
  GERENCIAL: ['OFICINA', 'USUARIO', 'PERFIL', 'FINANCEIRO', 'HORA_TECNICA', 'PRODUTIVIDADE', 'DESCONTO', 'DASHBOARD'],
  // Atendimento/relacionamento com o cliente e o que é vendido a ele.
  COMERCIAL: ['CLIENTE', 'VEICULO', 'AGENDA', 'ORCAMENTO', 'SERVICO'],
  // Execução do serviço dentro da oficina.
  TECNICO: ['ORDEM_SERVICO', 'CHECKLIST', 'FOTO', 'ESTOQUE'],
};

const CATEGORIA_POR_RECURSO = new Map<string, PermissaoCategoria>();
for (const [categoria, recursos] of Object.entries(RECURSOS_POR_CATEGORIA) as [
  Exclude<PermissaoCategoria, 'OUTROS'>,
  string[],
][]) {
  for (const recurso of recursos) CATEGORIA_POR_RECURSO.set(recurso, categoria);
}

const SUFIXOS_ACAO = ['_READ', '_WRITE', '_GERENCIAR', '_APROVAR', '_RESERVAR'];

/** "ORDEM_SERVICO_WRITE" → "ORDEM_SERVICO"; sem sufixo de ação reconhecido, devolve o código inteiro. */
function recursoDoCodigo(codigo: string): string {
  const sufixo = SUFIXOS_ACAO.find((s) => codigo.endsWith(s));
  return sufixo ? codigo.slice(0, -sufixo.length) : codigo;
}

/**
 * Categoriza uma permissão pelo prefixo do recurso no código. Uma permissão
 * nova que o backend adicione sem estar nesse mapa cai em "Outros" em vez de
 * desaparecer do formulário — nunca omite uma permissão real do catálogo.
 */
export function categoriaDaPermissao(codigo: string): PermissaoCategoria {
  return CATEGORIA_POR_RECURSO.get(recursoDoCodigo(codigo)) ?? 'OUTROS';
}

/** Agrupa a lista de permissões do catálogo por categoria, preservando a ordem que o backend devolveu dentro de cada grupo. */
export function agruparPermissoesPorCategoria<T extends { codigo?: string | null }>(
  permissoes: T[] | undefined,
): Map<PermissaoCategoria, T[]> {
  const grupos = new Map<PermissaoCategoria, T[]>();
  for (const perm of permissoes ?? []) {
    if (!perm.codigo) continue;
    const categoria = categoriaDaPermissao(perm.codigo);
    const grupo = grupos.get(categoria);
    if (grupo) grupo.push(perm);
    else grupos.set(categoria, [perm]);
  }
  return grupos;
}
