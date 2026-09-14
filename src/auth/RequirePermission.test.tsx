import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { RequirePermission } from './RequirePermission';

describe('RequirePermission', () => {
  it('renders children when the session has the required permission', () => {
    useAuthStore.setState({ permissoes: ['CLIENTE_READ'] });
    render(
      <RequirePermission codigo="CLIENTE_READ">
        <div>Lista de clientes</div>
      </RequirePermission>,
    );

    expect(screen.getByText('Lista de clientes')).toBeInTheDocument();
  });

  it('renders children when the session has any one of several accepted codes', () => {
    useAuthStore.setState({ permissoes: ['ORDEM_SERVICO_WRITE'] });
    render(
      <RequirePermission codigo={['ORDEM_SERVICO_READ', 'ORDEM_SERVICO_WRITE']}>
        <div>Ordens de serviço</div>
      </RequirePermission>,
    );

    expect(screen.getByText('Ordens de serviço')).toBeInTheDocument();
  });

  it('shows the default "sem permissão" empty state when the session lacks the code', () => {
    useAuthStore.setState({ permissoes: [] });
    render(
      <RequirePermission codigo="CLIENTE_READ">
        <div>Lista de clientes</div>
      </RequirePermission>,
    );

    expect(screen.queryByText('Lista de clientes')).not.toBeInTheDocument();
    expect(screen.getByText('Sem permissão')).toBeInTheDocument();
  });

  it('renders a custom fallback instead of the default empty state when provided', () => {
    useAuthStore.setState({ permissoes: [] });
    render(
      <RequirePermission codigo="CLIENTE_READ" fallback={<div>Fallback customizado</div>}>
        <div>Lista de clientes</div>
      </RequirePermission>,
    );

    expect(screen.getByText('Fallback customizado')).toBeInTheDocument();
    expect(screen.queryByText('Sem permissão')).not.toBeInTheDocument();
  });
});
