import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Bike,
  FileText,
  Wrench,
  Package,
  ClipboardList,
  ClipboardCheck,
  Wallet,
  UserCog,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  group: 'operacao' | 'gestao' | 'admin';
  /** Permission codes that unlock this item — any one of them is enough. `undefined` means always visible. */
  permissions?: string[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, group: 'operacao', permissions: ['DASHBOARD_READ'] },
  { label: 'Agenda', to: '/agenda', icon: CalendarClock, group: 'operacao', permissions: ['AGENDA_READ'] },
  { label: 'Clientes', to: '/clientes', icon: Users, group: 'operacao', permissions: ['CLIENTE_READ'] },
  { label: 'Veículos', to: '/veiculos', icon: Bike, group: 'operacao', permissions: ['VEICULO_READ'] },
  { label: 'Orçamentos', to: '/orcamentos', icon: FileText, group: 'operacao', permissions: ['ORCAMENTO_READ'] },
  {
    label: 'Ordens de Serviço',
    to: '/ordens-servico',
    icon: ClipboardList,
    group: 'operacao',
    permissions: ['ORDEM_SERVICO_READ'],
  },
  {
    label: 'Minhas OS',
    to: '/minhas-os',
    icon: ClipboardCheck,
    group: 'operacao',
    permissions: ['ORDEM_SERVICO_WRITE'],
  },
  { label: 'Produtos e Estoque', to: '/produtos', icon: Package, group: 'gestao', permissions: ['ESTOQUE_READ'] },
  { label: 'Catálogo de Serviços', to: '/servicos', icon: Wrench, group: 'gestao', permissions: ['SERVICO_READ'] },
  { label: 'Financeiro', to: '/financeiro', icon: Wallet, group: 'gestao', permissions: ['FINANCEIRO_READ'] },
  { label: 'Usuários', to: '/usuarios', icon: UserCog, group: 'admin', permissions: ['USUARIO_READ'] },
  { label: 'Perfis de Acesso', to: '/perfis', icon: ShieldCheck, group: 'admin', permissions: ['PERFIL_READ'] },
  { label: 'Minha Oficina', to: '/oficina', icon: Building2, group: 'admin', permissions: ['OFICINA_READ'] },
];

/** Paths that make up the mobile bottom tab bar — the rest fall into the "Mais" drawer. */
export const MOBILE_PRIMARY_PATHS = ['/', '/agenda', '/clientes', '/ordens-servico', '/minhas-os'];

export const groupLabels: Record<NavItem['group'], string> = {
  operacao: 'Operação',
  gestao: 'Gestão',
  admin: 'Administração',
};

function isUnlocked(item: NavItem, hasPermission: (codigo: string) => boolean): boolean {
  return !item.permissions || item.permissions.some(hasPermission);
}

/**
 * O nome do perfil é texto livre em Perfis de Acesso — não dá pra travar nisso
 * com segurança (um admin pode renomear "Mecanico" pra qualquer coisa). Serve
 * só como atalho de UX (menu reduzido, landing page) pro cadastro padrão; não
 * substitui os códigos de permissão, que continuam sendo o que realmente
 * controla acesso a cada rota.
 */
function isMecanico(perfil?: string): boolean {
  const normalizado = (perfil ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return normalizado.includes('mecanico');
}

// Único caminho que um perfil Mecânico precisa no dia a dia — só a lista geral
// (pra achar uma OS de outro colega) e "Minhas OS" (a própria fila de trabalho).
// Qualquer outra permissão que o perfil tenha (ex.: DASHBOARD_READ do seed
// padrão) fica sem item de menu correspondente enquanto o perfil for esse.
const CAMINHOS_MECANICO = ['/ordens-servico', '/minhas-os'];

export function filterNavByPermission(hasPermission: (codigo: string) => boolean, perfil?: string): NavItem[] {
  const desbloqueados = navItems.filter((item) => isUnlocked(item, hasPermission));
  if (isMecanico(perfil)) return desbloqueados.filter((item) => CAMINHOS_MECANICO.includes(item.to));
  return desbloqueados;
}

/**
 * First route a freshly-logged-in session should land on. Um perfil Mecânico
 * cai direto em "Minhas OS" — mesmo tendo DASHBOARD_READ no perfil seed —
 * porque o dashboard geral não é útil pra quem só precisa abrir/pausar/
 * concluir as próprias ordens. Fora esse caso, Dashboard vence sempre que
 * disponível; senão, o primeiro item de menu que a sessão acessa — ex.: um
 * perfil Operacional (sem DASHBOARD_READ) cai direto em Ordens de Serviço.
 */
export function getLandingPath(hasPermission: (codigo: string) => boolean, perfil?: string): string {
  if (isMecanico(perfil) && hasPermission('ORDEM_SERVICO_WRITE')) return '/minhas-os';
  if (hasPermission('DASHBOARD_READ')) return '/';
  const firstAccessible = navItems.find((item) => isUnlocked(item, hasPermission));
  return firstAccessible?.to ?? '/login';
}
