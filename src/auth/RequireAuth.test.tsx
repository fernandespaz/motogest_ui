import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { RequireAuth } from './RequireAuth';

function renderWithRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<div>Conteúdo protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects to /login when there is no authenticated session', () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderWithRoute('/');

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it('renders the protected route when the session is authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });
    renderWithRoute('/');

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
