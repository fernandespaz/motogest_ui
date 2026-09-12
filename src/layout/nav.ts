import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Bike,
  FileText,
  Wrench,
  Package,
  ClipboardList,
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
  { label: 'Produtos e Estoque', to: '/produtos', icon: Package, group: 'gestao', permissions: ['ESTOQUE_READ'] },
  { label: 'Catálogo de Serviços', to: '/servicos', icon: Wrench, group: 'gestao', permissions: ['SERVICO_READ'] },
  { label: 'Financeiro', to: '/financeiro', icon: Wallet, group: 'gestao', permissions: ['FINANCEIRO_READ'] },
  { label: 'Usuários', to: '/usuarios', icon: UserCog, group: 'admin', permissions: ['USUARIO_READ'] },
  { label: 'Perfis de Acesso', to: '/perfis', icon: ShieldCheck, group: 'admin', permissions: ['PERFIL_READ'] },
  { label: 'Minha Oficina', to: '/oficina', icon: Building2, group: 'admin', permissions: ['OFICINA_READ'] },
];

/** Paths that make up the mobile bottom tab bar — the rest fall into the "Mais" drawer. */
export const MOBILE_PRIMARY_PATHS = ['/', '/agenda', '/clientes', '/ordens-servico'];

export const groupLabels: Record<NavItem['group'], string> = {
  operacao: 'Operação',
  gestao: 'Gestão',
  admin: 'Administração',
};

function isUnlocked(item: NavItem, hasPermission: (codigo: string) => boolean): boolean {
  return !item.permissions || item.permissions.some(hasPermission);
}

export function filterNavByPermission(hasPermission: (codigo: string) => boolean): NavItem[] {
  return navItems.filter((item) => isUnlocked(item, hasPermission));
}

/**
 * First route a freshly-logged-in session should land on. Dashboard wins whenever
 * it's available; otherwise the first nav item the session actually has access to —
 * e.g. an Operacional profile (no DASHBOARD_READ) lands straight on Ordens de Serviço.
 */
export function getLandingPath(hasPermission: (codigo: string) => boolean): string {
  if (hasPermission('DASHBOARD_READ')) return '/';
  const firstAccessible = navItems.find((item) => isUnlocked(item, hasPermission));
  return firstAccessible?.to ?? '/login';
}
