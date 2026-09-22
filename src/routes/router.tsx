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
import { MinhasOrdensServicoPage } from '@/features/ordens-servico/MinhasOrdensServicoPage';
import { MinhaOrdemServicoDetalhePage } from '@/features/ordens-servico/MinhaOrdemServicoDetalhePage';
import { ProdutosPage } from '@/features/produtos/ProdutosPage';
import { ServicosPage } from '@/features/servicos/ServicosPage';
import { FinanceiroPage } from '@/features/financeiro/FinanceiroPage';
import { UsuariosPage } from '@/features/usuarios/UsuariosPage';
import { PerfisPage } from '@/features/perfis/PerfisPage';
import { OficinaPage } from '@/features/oficina/OficinaPage';
import { DescontosPage } from '@/features/descontos/DescontosPage';
import { RequirePermission } from '@/auth/RequirePermission';
import { PERMISSAO_GERENCIAR_HORA_TECNICA } from '@/hooks/useHoraTecnica';
import { HoraTecnicaPage, HoraTecnicaSemAcesso } from '@/features/hora-tecnica/HoraTecnicaPage';
import { ProdutividadeConsultoresPage } from '@/features/produtividade/ProdutividadeConsultoresPage';
import { ConsultorDetalhePage } from '@/features/produtividade/ConsultorDetalhePage';
import { ProdutividadeMecanicosPage } from '@/features/produtividade/ProdutividadeMecanicosPage';
import { MecanicoDetalhePage } from '@/features/produtividade/MecanicoDetalhePage';
import { MinhaProdutividadePage } from '@/features/produtividade/MinhaProdutividadePage';
import { GuardaProdutividade } from '@/features/produtividade/ProdutividadeAbas';

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
          // Sem rota de criação direta — toda OS nasce de um Orçamento aprovado
          // (ver "a-partir-de-orcamento" na conversão), nunca é criada do zero aqui.
          { path: '/ordens-servico/:id', element: <OrdemServicoFormPage /> },
          { path: '/minhas-os', element: <MinhasOrdensServicoPage /> },
          // Tela própria do técnico pra uma OS — deliberadamente separada de
          // /ordens-servico/:id (Consultor/Admin): só leitura pros dados
          // comerciais da OS, nenhum campo editável (ver comentário no topo
          // do componente).
          { path: '/minhas-os/:id', element: <MinhaOrdemServicoDetalhePage /> },
          { path: '/produtos', element: <ProdutosPage /> },
          { path: '/servicos', element: <ServicosPage /> },
          { path: '/financeiro', element: <FinanceiroPage /> },
          // Gate na rota: sem a permissão a página nem monta, então nenhuma
          // query dispara pra estourar 403 (o backend continua sendo a trava real).
          {
            path: '/hora-tecnica',
            element: (
              <RequirePermission codigo={PERMISSAO_GERENCIAR_HORA_TECNICA} fallback={<HoraTecnicaSemAcesso />}>
                <HoraTecnicaPage />
              </RequirePermission>
            ),
          },
          {
            path: '/produtividade',
            element: (
              <RequirePermission codigo="PRODUTIVIDADE_READ">
                <GuardaProdutividade permitirConsultor>
                  <ProdutividadeConsultoresPage />
                </GuardaProdutividade>
              </RequirePermission>
            ),
          },
          {
            path: '/produtividade/consultores/:usuarioId',
            element: (
              <RequirePermission codigo="PRODUTIVIDADE_READ">
                <GuardaProdutividade permitirConsultor>
                  <ConsultorDetalhePage />
                </GuardaProdutividade>
              </RequirePermission>
            ),
          },
          {
            path: '/produtividade/mecanicos',
            element: (
              <RequirePermission codigo="PRODUTIVIDADE_READ">
                <GuardaProdutividade>
                  <ProdutividadeMecanicosPage />
                </GuardaProdutividade>
              </RequirePermission>
            ),
          },
          {
            path: '/produtividade/mecanicos/:usuarioId',
            element: (
              <RequirePermission codigo="PRODUTIVIDADE_READ">
                <GuardaProdutividade>
                  <MecanicoDetalhePage />
                </GuardaProdutividade>
              </RequirePermission>
            ),
          },
          // Sem RequirePermission na rota: a própria tela explica ao mecânico
          // que o relatório depende de PRODUTIVIDADE_READ (ver o componente).
          { path: '/minha-produtividade', element: <MinhaProdutividadePage /> },
          { path: '/usuarios', element: <UsuariosPage /> },
          { path: '/perfis', element: <PerfisPage /> },
          { path: '/descontos', element: <DescontosPage /> },
          { path: '/oficina', element: <OficinaPage /> },
          { path: '/oficina/licenca', element: <OficinaPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
