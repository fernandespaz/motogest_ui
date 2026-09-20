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

  it('renders nothing for an ATIVA licença with plenty of days left and no renewal reminder due', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'ATIVA', diasRestantes: 20 } } as never);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an ATIVA licença with auto-renewing subscription (proximaCobranca set), even close to dataExpiracao', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({
      data: { status: 'ATIVA', diasRestantes: 2, proximaCobranca: '2026-10-01T00:00:00Z' },
    } as never);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('warns an ATIVA one-off (no proximaCobranca) licença nearing expiration to renew manually', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'ATIVA', diasRestantes: 3 } } as never);
    renderBanner();
    expect(screen.getByText(/vence em 3 dias e não renova automaticamente/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Renovar agora' })).toHaveAttribute('href', '/oficina/licenca');
  });

  it('never claims an ATIVA plan "venceu" (already expired) — even at 0 dias restantes it just says "vence hoje" (regressão)', () => {
    // O badge de status na tela de Licença e plano continua mostrando
    // "Ativa" nesse momento — dizer "venceu" contradiz isso, e chegou a
    // acontecer no exato dia em que o plano tinha acabado de ser ativado.
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'ATIVA', diasRestantes: 0 } } as never);
    renderBanner();
    expect(screen.getByText('Seu plano vence hoje e não renova automaticamente.')).toBeInTheDocument();
    expect(screen.queryByText(/venceu/)).not.toBeInTheDocument();
  });

  it('always uses the same solid brand orange as the project buttons — same in light and dark, never amber or red', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'ATIVA', diasRestantes: 0 } } as never);
    const { container } = renderBanner();
    expect(container.firstChild).toHaveClass('bg-brand-600', 'text-white');
    expect(container.firstChild).not.toHaveClass('bg-amber-100', 'bg-red-100', 'bg-red-50', 'bg-brand-100');
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

  it('uses the same solid brand orange for an expired/urgent TRIAL too, not the old fixed light-only bg-red-50', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 0 } } as never);
    const { container } = renderBanner();
    expect(container.firstChild).toHaveClass('bg-brand-600', 'text-white');
  });

  it('links to the licença upgrade page', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { status: 'TRIAL', diasRestantes: 6 } } as never);
    renderBanner();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/oficina/licenca');
  });
});
