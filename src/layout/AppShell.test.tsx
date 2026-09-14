import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAutoConversaoOrcamentosAprovados } from '@/hooks/useAutoConversaoOrcamentos';
import { AppShell } from './AppShell';

vi.mock('./Sidebar', () => ({ Sidebar: () => <div>Sidebar mock</div> }));
vi.mock('./Topbar', () => ({ Topbar: () => <div>Topbar mock</div> }));
vi.mock('./MobileNav', () => ({ MobileNav: () => <div>MobileNav mock</div> }));
vi.mock('./TrialBanner', () => ({ TrialBanner: () => <div>TrialBanner mock</div> }));
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
});
