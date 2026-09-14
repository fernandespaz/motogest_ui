import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useLicencaAtual } from '@/hooks/useOficina';
import { TrialBanner } from './TrialBanner';

vi.mock('@/hooks/useOficina', () => ({
  useLicencaAtual: vi.fn(),
}));

function renderBanner() {
  return render(
    <MemoryRouter>
      <TrialBanner />
    </MemoryRouter>,
  );
}

describe('TrialBanner', () => {
  it('renders nothing while the licença has not loaded yet', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: undefined } as never);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a non-TRIAL licença', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'ATIVA' } } as never);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the days remaining, pluralized, for a TRIAL licença', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 6 } } as never);
    renderBanner();
    expect(screen.getByText(/termina em 6 dias/)).toBeInTheDocument();
  });

  it('uses the singular "dia" for exactly 1 day remaining', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 1 } } as never);
    renderBanner();
    expect(screen.getByText(/termina em 1 dia\./)).toBeInTheDocument();
  });

  it('shows the expired message once diasRestantes hits 0', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 0 } } as never);
    renderBanner();
    expect(screen.getByText('Seu período de teste terminou.')).toBeInTheDocument();
  });

  it('links to the licença upgrade page', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 6 } } as never);
    renderBanner();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/oficina/licenca');
  });
});
