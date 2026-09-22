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
  Percent,
  TrendingUp,
  Calculator,
} from 'lucide-react';
import { isMecanico } from '@/lib/perfil';

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
  { label: 'Hora Técnica', to: '/hora-tecnica', icon: Calculator, group: 'gestao', permissions: ['HORA_TECNICA_GERENCIAR'] },
  { label: 'Produtividade', to: '/produtividade', icon: TrendingUp, group: 'gestao', permissions: ['PRODUTIVIDADE_READ'] },
  {
    label: 'Solicitações de Desconto',
    to: '/descontos',
    icon: Percent,
    group: 'admin',
    permissions: ['DESCONTO_APROVAR'],
  },
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

// Único caminho que um perfil Mecânico precisa no dia a dia — só a lista geral
// (pra achar uma OS de outro colega) e "Minhas OS" (a própria fila de trabalho).
// Qualquer outra permissão que o perfil tenha (ex.: DASHBOARD_READ do seed
// padrão) fica sem item de menu correspondente enquanto o perfil for esse.
const CAMINHOS_MECANICO = ['/ordens-servico', '/minhas-os'];

export function filterNavByPermission(hasPermission: (codigo: string) => boolean, perfil?: string): NavItem[] {
  const desbloqueados = navItems.filter((item) => isUnlocked(item, hasPermission));
  if (isMecanico(perfil)) return desbloqueados.filter((item) => CAMINHOS_MECANICO.includes(item.to));
  // "Minhas OS" é a fila pessoal de um técnico com cronômetro — não faz
  // sentido pra quem não é Mecânico (Admin e Consultor Técnico também têm
  // ORDEM_SERVICO_WRITE, mas usam a lista completa em "Ordens de Serviço").
  return desbloqueados.filter((item) => item.to !== '/minhas-os');
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
