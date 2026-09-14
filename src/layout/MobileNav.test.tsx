import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { MobileNav } from './MobileNav';

function renderNav() {
  return render(
    <MemoryRouter>
      <MobileNav />
    </MemoryRouter>,
  );
}

describe('MobileNav', () => {
  it('shows primary items in the bottom bar and hides the "Mais" drawer initially', () => {
    useAuthStore.setState({ permissoes: ['DASHBOARD_READ', 'AGENDA_READ'], perfil: 'Administrador' });
    renderNav();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.queryByText('Sair da conta')).not.toBeInTheDocument();
  });

  it('hides the "Mais" button when there are no secondary items', () => {
    useAuthStore.setState({ permissoes: ['DASHBOARD_READ'], perfil: 'Administrador' });
    renderNav();
    expect(screen.queryByRole('button', { name: 'Mais' })).not.toBeInTheDocument();
  });

  it('opens the drawer with secondary items and logs out from it', async () => {
    const logoutSpy = vi.fn();
    useAuthStore.setState({ permissoes: ['DASHBOARD_READ', 'ESTOQUE_READ'], perfil: 'Administrador', logout: logoutSpy });
    renderNav();

    await userEvent.click(screen.getByRole('button', { name: /Mais/ }));

    expect(screen.getByText('Produtos e Estoque')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(logoutSpy).toHaveBeenCalled();
  });
});
