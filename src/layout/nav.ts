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
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, group: 'operacao' },
  { label: 'Agenda', to: '/agenda', icon: CalendarClock, group: 'operacao' },
  { label: 'Clientes', to: '/clientes', icon: Users, group: 'operacao' },
  { label: 'Veículos', to: '/veiculos', icon: Bike, group: 'operacao' },
  { label: 'Orçamentos', to: '/orcamentos', icon: FileText, group: 'operacao' },
  { label: 'Ordens de Serviço', to: '/ordens-servico', icon: ClipboardList, group: 'operacao' },
  { label: 'Produtos e Estoque', to: '/produtos', icon: Package, group: 'gestao' },
  { label: 'Catálogo de Serviços', to: '/servicos', icon: Wrench, group: 'gestao' },
  { label: 'Financeiro', to: '/financeiro', icon: Wallet, group: 'gestao' },
  { label: 'Usuários', to: '/usuarios', icon: UserCog, group: 'admin' },
  { label: 'Perfis de Acesso', to: '/perfis', icon: ShieldCheck, group: 'admin' },
  { label: 'Minha Oficina', to: '/oficina', icon: Building2, group: 'admin' },
];

export const mobilePrimaryNav = navItems.filter((item) =>
  ['/', '/agenda', '/clientes', '/ordens-servico'].includes(item.to),
);
