/**
 * O nome do perfil é texto livre em Perfis de Acesso — não dá pra travar nisso
 * com segurança (um admin pode renomear "Mecanico" pra qualquer coisa). Serve
 * só como atalho de UX (menu reduzido, landing page, filtro de listas) pro
 * cadastro padrão; não substitui os códigos de permissão, que continuam sendo
 * o que realmente controla acesso a cada rota.
 */
function normalizar(perfil?: string): string {
  return (perfil ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function isMecanico(perfil?: string): boolean {
  return normalizar(perfil).includes('mecanico');
}

/**
 * Mesmo alcance de `isMecanico`: decide o formato da tela (dashboard e
 * relatório de produtividade focados na própria pessoa), nunca o que o
 * backend deixa ler — quem tem PRODUTIVIDADE_READ continua podendo chamar o
 * relatório geral direto na API, independente do nome do perfil.
 */
export function isConsultor(perfil?: string): boolean {
  return normalizar(perfil).includes('consultor');
}
