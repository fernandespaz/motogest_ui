/**
 * O nome do perfil é texto livre em Perfis de Acesso — não dá pra travar nisso
 * com segurança (um admin pode renomear "Mecanico" pra qualquer coisa). Serve
 * só como atalho de UX (menu reduzido, landing page, filtro de listas) pro
 * cadastro padrão; não substitui os códigos de permissão, que continuam sendo
 * o que realmente controla acesso a cada rota.
 */
export function isMecanico(perfil?: string): boolean {
  const normalizado = (perfil ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return normalizado.includes('mecanico');
}
