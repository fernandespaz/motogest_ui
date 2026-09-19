import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useLicencaAtual } from '@/hooks/useOficina';
import { TrialExpiredDialog } from './TrialExpiredDialog';

const navigateMock = vi.fn();

vi.mock('@/hooks/useOficina', () => ({
  useLicencaAtual: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderDialog() {
  return render(
    <MemoryRouter>
      <TrialExpiredDialog />
    </MemoryRouter>,
  );
}

describe('TrialExpiredDialog', () => {
  it('stays closed while the licença has not loaded yet', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: undefined } as never);
    renderDialog();
    expect(screen.queryByText('Seu período de teste terminou')).not.toBeInTheDocument();
  });

  it('stays closed for an active licença', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'ATIVA' } } as never);
    renderDialog();
    expect(screen.queryByText('Seu período de teste terminou')).not.toBeInTheDocument();
  });

  it('stays closed for a TRIAL licença that still has days left', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 3 } } as never);
    renderDialog();
    expect(screen.queryByText('Seu período de teste terminou')).not.toBeInTheDocument();
  });

  it('opens once a TRIAL licença runs out of days', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 0 } } as never);
    renderDialog();
    expect(screen.getByText('Seu período de teste terminou')).toBeInTheDocument();
  });

  it('opens for an EXPIRADA licença', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'EXPIRADA' } } as never);
    renderDialog();
    expect(screen.getByText('Seu período de teste terminou')).toBeInTheDocument();
  });

  it('navigates to the licença upgrade page when choosing a plan', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'EXPIRADA' } } as never);
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Escolher plano' }));
    expect(navigateMock).toHaveBeenCalledWith('/oficina/licenca');
  });
});
