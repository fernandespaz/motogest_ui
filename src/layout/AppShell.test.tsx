import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAutoConversaoOrcamentosAprovados } from '@/hooks/useAutoConversaoOrcamentos';
import { AppShell } from './AppShell';

vi.mock('./Sidebar', () => ({ Sidebar: () => <div>Sidebar mock</div> }));
vi.mock('./Topbar', () => ({ Topbar: () => <div>Topbar mock</div> }));
vi.mock('./MobileNav', () => ({ MobileNav: () => <div>MobileNav mock</div> }));
vi.mock('./TrialBanner', () => ({ TrialBanner: () => <div>TrialBanner mock</div> }));
vi.mock('./TrialExpiredDialog', () => ({ TrialExpiredDialog: () => <div>TrialExpiredDialog mock</div> }));
vi.mock('@/hooks/useAutoConversaoOrcamentos', () => ({
  useAutoConversaoOrcamentosAprovados: vi.fn(),
}));

describe('AppShell', () => {
  it('renders the shared chrome around the routed page content', () => {
    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/clientes" element={<div>Lista de clientes</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sidebar mock')).toBeInTheDocument();
    expect(screen.getByText('Topbar mock')).toBeInTheDocument();
    expect(screen.getByText('TrialBanner mock')).toBeInTheDocument();
    expect(screen.getByText('TrialExpiredDialog mock')).toBeInTheDocument();
    expect(screen.getByText('MobileNav mock')).toBeInTheDocument();
    expect(screen.getByText('Lista de clientes')).toBeInTheDocument();
  });

  it('runs the auto-conversion watcher on every authenticated screen', () => {
    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/clientes" element={<div>Lista de clientes</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(useAutoConversaoOrcamentosAprovados).toHaveBeenCalled();
  });

  it('keeps the latest page rendered after rapid-fire navigation (no blank content area)', async () => {
    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route
              path="/clientes"
              element={
                <div>
                  Lista de clientes
                  <Link to="/veiculos">ir veiculos</Link>
                </div>
              }
            />
            <Route
              path="/veiculos"
              element={
                <div>
                  Lista de veiculos
                  <Link to="/clientes">ir clientes</Link>
                  <Link to="/agenda">ir agenda</Link>
                </div>
              }
            />
            <Route path="/agenda" element={<div>Agenda do dia</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('ir veiculos'));
    await userEvent.click(screen.getByText('ir clientes'));
    await userEvent.click(screen.getByText('ir veiculos'));
    await userEvent.click(screen.getByText('ir agenda'));

    expect(await screen.findByText('Agenda do dia')).toBeInTheDocument();
    expect(screen.queryByText('Lista de veiculos')).not.toBeInTheDocument();
  });
});
