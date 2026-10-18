import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { abrirPermissaoNegada, usePermissaoNegadaStore } from '@/lib/permissaoNegada';
import { toast } from '@/store/toastStore';
import { PermissaoNegadaDialog } from './PermissaoNegadaDialog';

vi.mock('@/store/toastStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/toastStore')>()),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('PermissaoNegadaDialog', () => {
  beforeEach(() => {
    usePermissaoNegadaStore.getState().fechar();
    useAuthStore.setState({ perfil: 'Caixa', permissoes: ['CAIXA_OPERAR'] });
    vi.mocked(toast.info).mockClear();
  });

  it('não aparece sem um 403', () => {
    render(<PermissaoNegadaDialog />);

    expect(screen.queryByText('Seu perfil não tem acesso a esta ação')).not.toBeInTheDocument();
  });

  it('diz qual permissão falta, o perfil atual e onde pedir a liberação', async () => {
    render(<PermissaoNegadaDialog />);
    abrirPermissaoNegada('get', '/api/v1/caixa/movimentos/periodo');

    expect(await screen.findByText('Seu perfil não tem acesso a esta ação')).toBeInTheDocument();
    expect(screen.getByText('Visualizar contas e caixa')).toBeInTheDocument();
    expect(screen.getByText('FINANCEIRO_READ')).toBeInTheDocument();
    expect(screen.getByText('“Caixa”')).toBeInTheDocument();
    expect(screen.getByText(/Administração › Perfis de Acesso/)).toBeInTheDocument();
  });

  it('lista as alternativas quando basta uma de várias permissões', async () => {
    useAuthStore.setState({ perfil: 'Mecanico', permissoes: [] });
    render(<PermissaoNegadaDialog />);
    abrirPermissaoNegada('post', '/api/v1/caixa/movimentos');

    expect(await screen.findByText(/uma destas permissões/)).toBeInTheDocument();
    expect(screen.getByText('CAIXA_OPERAR')).toBeInTheDocument();
    expect(screen.getByText('FINANCEIRO_WRITE')).toBeInTheDocument();
  });

  it('copia um pedido pronto para o administrador', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<PermissaoNegadaDialog />);
    abrirPermissaoNegada('get', '/api/v1/caixa/movimentos/periodo');

    await userEvent.click(await screen.findByRole('button', { name: /Copiar pedido/ }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('FINANCEIRO_READ'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"Caixa"'));
    expect(toast.info).toHaveBeenCalled();
  });

  it('não pede permissão que o perfil já tem (bloqueio por outro motivo)', async () => {
    render(<PermissaoNegadaDialog />);
    abrirPermissaoNegada('get', '/api/v1/caixa/sessoes/aberta');

    expect(await screen.findByText(/não vale para este registro/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copiar pedido/ })).not.toBeInTheDocument();
  });

  it('explica que não soube identificar a permissão quando o endpoint é desconhecido', async () => {
    render(<PermissaoNegadaDialog />);
    abrirPermissaoNegada('get', '/api/v1/rota-nova');

    expect(await screen.findByText(/Não foi possível identificar qual permissão falta/)).toBeInTheDocument();
  });

  it('fecha em "Entendi"', async () => {
    render(<PermissaoNegadaDialog />);
    abrirPermissaoNegada('get', '/api/v1/caixa/movimentos/periodo');

    await userEvent.click(await screen.findByRole('button', { name: 'Entendi' }));

    expect(usePermissaoNegadaStore.getState().negada).toBeNull();
  });
});
