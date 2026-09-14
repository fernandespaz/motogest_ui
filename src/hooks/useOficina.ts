import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { oficinasApi } from '@/api/endpoints/oficinas';
import { licencaApi } from '@/api/endpoints/licenca';
import { useAuthStore } from '@/store/authStore';
import type { OficinaUpdateRequest, UpgradeLicencaRequest } from '@/api/types';

const oficinaLogoBlobKey = ['oficina', 'logo-blob'] as const;
// Tracks the one blob: URL currently in use across every consumer of
// useOficinaLogoSrc (Sidebar + Topbar + Minha Oficina all share the same
// cached query) — revoked only when superseded by a fresh fetch, never on a
// single consumer unmounting, since that would break the URL for the others
// still rendering it.
let logoBlobUrlEmUso: string | null = null;

// A tela de login não sabe qual oficina está acessando antes da autenticação
// (o campo identificador é único de propósito, pra não abrir uma rota de
// enumeração de tenant) — então não dá pra buscar a logo certa nesse momento.
// Como solução combinada com o usuário: a logo fica "fixada" neste navegador
// (localStorage) assim que é buscada autenticado, e a tela de login passa a
// usá-la a partir da próxima vez que carregar nesse mesmo navegador.
const LOGO_LOGIN_STORAGE_KEY = 'motogest:login-logo';

function fixarLogoParaLogin(blob: Blob) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      localStorage.setItem(LOGO_LOGIN_STORAGE_KEY, reader.result as string);
    } catch {
      // localStorage indisponível ou cheio — a logo simplesmente não fica fixada
      // neste navegador; o upload em si não é afetado.
    }
  };
  reader.readAsDataURL(blob);
}

function removerLogoFixadaDoLogin() {
  try {
    localStorage.removeItem(LOGO_LOGIN_STORAGE_KEY);
  } catch {
    // ignora — sem cache local para limpar
  }
}

export function getLogoFixadaParaLogin(): string | null {
  try {
    return localStorage.getItem(LOGO_LOGIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Mesma ideia da logo: o nome fantasia da oficina fica fixado neste navegador
// assim que é buscado autenticado, pra substituir o nome fixo "MotoGest" no
// topo da tela de login nas próximas vezes — sem precisar descobrir o tenant
// antes do login.
const NOME_LOGIN_STORAGE_KEY = 'motogest:login-nome';

function fixarNomeParaLogin(nome: string | undefined | null) {
  if (!nome) return;
  try {
    localStorage.setItem(NOME_LOGIN_STORAGE_KEY, nome);
  } catch {
    // ignora — o nome simplesmente não fica fixado neste navegador
  }
}

export function getNomeFixadoParaLogin(): string | null {
  try {
    return localStorage.getItem(NOME_LOGIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useOficinaAtual() {
  // Sidebar/Topbar chamam esse hook em toda tela pra mostrar o nome/logo da
  // oficina, mas perfis operacionais (Mecânico, Consultor Técnico) não têm
  // OFICINA_READ — sem esse gate, todo carregamento de página disparava um
  // 403 real pra esses perfis, estourando o toast de erro global.
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: ['oficina', 'atual'],
    queryFn: async () => {
      const oficina = await oficinasApi.atual();
      fixarNomeParaLogin(oficina.nomeFantasia || oficina.razaoSocial);
      return oficina;
    },
    enabled: hasPermission('OFICINA_READ'),
  });
}

export function useAtualizarOficina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OficinaUpdateRequest) => oficinasApi.atualizar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oficina', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}

/**
 * GET /oficinas/atual/logo requires o header JWT (não dá pra usar num <img
 * src> puro) — busca o blob uma vez (via apiClient, com o auth junto) e devolve
 * uma blob: URL local que Sidebar/Topbar/Minha Oficina compartilham via cache.
 *
 * GET /oficinas/atual/logo exige a MESMA permissão OFICINA_READ de GET
 * /oficinas/atual (confirmado direto no backend) — perfis operacionais
 * (Mecânico, Consultor Técnico) não têm, então nunca conseguem buscar a logo
 * pela rota autenticada. Como último recurso, cai pra logo fixada neste
 * navegador (a mesma cache usada na tela de login) — só funciona se ALGUÉM
 * com OFICINA_READ já tiver aberto o app nesse aparelho antes; sem isso, é a
 * "MG" mesmo. Resolver de verdade exigiria o backend liberar essa rota (é só
 * branding, não é dado sensível de configuração) pra qualquer usuário do
 * tenant, não só quem tem OFICINA_READ.
 */
export function useOficinaLogoSrc(): string | undefined {
  const { data: oficina } = useOficinaAtual();
  const { data: blobUrl } = useQuery({
    queryKey: oficinaLogoBlobKey,
    queryFn: async () => {
      const blob = await oficinasApi.buscarLogoBlob();
      fixarLogoParaLogin(blob);
      const url = URL.createObjectURL(blob);
      if (logoBlobUrlEmUso) URL.revokeObjectURL(logoBlobUrlEmUso);
      logoBlobUrlEmUso = url;
      return url;
    },
    enabled: !!oficina?.logoImagemDisponivel,
    staleTime: Infinity,
    meta: { silentError: true },
  });

  return blobUrl ?? oficina?.logoUrl ?? getLogoFixadaParaLogin() ?? undefined;
}

export function useEnviarLogoOficina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arquivo: File) => oficinasApi.enviarLogo(arquivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oficina', 'atual'] });
      qc.invalidateQueries({ queryKey: oficinaLogoBlobKey });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useRemoverLogoOficina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => oficinasApi.removerLogo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oficina', 'atual'] });
      // removeQueries (not just invalidate) so the stale blob URL disappears
      // immediately — with logoImagemDisponivel now false the query goes
      // disabled and would otherwise keep serving its last cached data forever.
      if (logoBlobUrlEmUso) {
        URL.revokeObjectURL(logoBlobUrlEmUso);
        logoBlobUrlEmUso = null;
      }
      qc.removeQueries({ queryKey: oficinaLogoBlobKey });
      removerLogoFixadaDoLogin();
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useLicencaAtual() {
  return useQuery({ queryKey: ['licenca', 'atual'], queryFn: () => licencaApi.atual() });
}

export function useUpgradeLicenca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpgradeLicencaRequest) => licencaApi.upgrade(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenca', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}
