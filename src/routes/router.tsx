import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/auth/RequireAuth';
import { AppShell } from '@/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterOficinaPage } from '@/features/auth/RegisterOficinaPage';
import { RootConsolePage } from '@/features/root/RootConsolePage';
import { OrcamentoPublicoPage } from '@/features/orcamentos/OrcamentoPublicoPage';
import { OrdemServicoPublicoPage } from '@/features/ordens-servico/OrdemServicoPublicoPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ClientesPage } from '@/features/clientes/ClientesPage';
import { VeiculosPage } from '@/features/veiculos/VeiculosPage';
import { AgendaPage } from '@/features/agenda/AgendaPage';
import { OrcamentosPage } from '@/features/orcamentos/OrcamentosPage';
import { OrcamentoFormPage } from '@/features/orcamentos/OrcamentoFormPage';
import { OrdensServicoPage } from '@/features/ordens-servico/OrdensServicoPage';
import { OrdemServicoFormPage } from '@/features/ordens-servico/OrdemServicoFormPage';
import { ProdutosPage } from '@/features/produtos/ProdutosPage';
import { ServicosPage } from '@/features/servicos/ServicosPage';
import { FinanceiroPage } from '@/features/financeiro/FinanceiroPage';
import { UsuariosPage } from '@/features/usuarios/UsuariosPage';
import { PerfisPage } from '@/features/perfis/PerfisPage';
import { OficinaPage } from '@/features/oficina/OficinaPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterOficinaPage /> },
  // Uso interno do root da plataforma — não fica em nenhum menu do app nem exige
  // sessão de tenant; o próprio X-Admin-Token é o gate (ver RootConsolePage).
  { path: '/root/oficinas', element: <RootConsolePage /> },
  // Página pública aberta pelo cliente final (link de WhatsApp/e-mail) — sem RequireAuth.
  { path: '/orcamentos/publico/:token', element: <OrcamentoPublicoPage /> },
  { path: '/ordens-servico/publico/:token', element: <OrdemServicoPublicoPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/agenda', element: <AgendaPage /> },
          { path: '/clientes', element: <ClientesPage /> },
          { path: '/veiculos', element: <VeiculosPage /> },
          { path: '/orcamentos', element: <OrcamentosPage /> },
          { path: '/orcamentos/novo', element: <OrcamentoFormPage /> },
          { path: '/orcamentos/:id', element: <OrcamentoFormPage /> },
          { path: '/ordens-servico', element: <OrdensServicoPage /> },
          { path: '/ordens-servico/nova', element: <OrdemServicoFormPage /> },
          { path: '/ordens-servico/:id', element: <OrdemServicoFormPage /> },
          { path: '/produtos', element: <ProdutosPage /> },
          { path: '/servicos', element: <ServicosPage /> },
          { path: '/financeiro', element: <FinanceiroPage /> },
          { path: '/usuarios', element: <UsuariosPage /> },
          { path: '/perfis', element: <PerfisPage /> },
          { path: '/oficina', element: <OficinaPage /> },
          { path: '/oficina/licenca', element: <OficinaPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
