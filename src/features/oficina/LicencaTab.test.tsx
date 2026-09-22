import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLicencaAtual } from '@/hooks/useOficina';
import { LicencaTab } from './LicencaTab';

vi.mock('@/hooks/useOficina', () => ({
  useLicencaAtual: vi.fn(),
}));
// A lógica de exibição do cartão de renovação é o que está sob teste aqui —
// mockar o modal de pagamento evita precisar simular toda a árvore de hooks
// dele (chave pública, SDK do PagBank, mutations) só para este arquivo.
vi.mock('./PagamentoCartaoModal', () => ({
  PagamentoCartaoModal: () => null,
}));

describe('LicencaTab', () => {
  it('shows a loading spinner while the licença has not loaded yet', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<LicencaTab />);
    expect(screen.queryByText('Status da licença')).not.toBeInTheDocument();
  });

  // Regressão: um plano ATIVA pago via pedido avulso (sem proximaCobranca)
  // mostrava "Renove seu plano para não perder o acesso" logo depois de um
  // pagamento bem-sucedido, mesmo com dias de sobra — a mensagem errada no
  // momento em que o pagamento acabou de ser concluído.
  it('does not show the "renove" card right after a successful one-off payment, with plenty of days left (regressão)', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({
      data: { status: 'ATIVA', plano: 'BASICO', diasRestantes: 7, dataAtivacao: '2026-09-20', dataExpiracao: '2026-10-20' },
      isLoading: false,
    } as never);
    render(<LicencaTab />);

    expect(screen.queryByText('Renove seu plano para não perder o acesso')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renovar plano' })).not.toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows the "renove" card once an ATIVA one-off plan gets close to its expiration (≤5 dias)', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({
      data: { status: 'ATIVA', plano: 'BASICO', diasRestantes: 3, dataAtivacao: '2026-09-20', dataExpiracao: '2026-09-27' },
      isLoading: false,
    } as never);
    render(<LicencaTab />);

    expect(screen.getByText('Renove seu plano para não perder o acesso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renovar plano' })).toBeInTheDocument();
  });

  it('never shows the "renove" card for an ATIVA plan with an auto-renewing subscription, regardless of dias restantes', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({
      data: { status: 'ATIVA', plano: 'PRO', diasRestantes: 1, proximaCobranca: '2026-10-01T00:00:00Z' },
      isLoading: false,
    } as never);
    render(<LicencaTab />);

    expect(screen.queryByText('Renove seu plano para não perder o acesso')).not.toBeInTheDocument();
    expect(screen.getByText(/Assinatura com renovação automática/)).toBeInTheDocument();
  });

  it('always shows the "upgrade" card for a TRIAL licença, regardless of dias restantes', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({
      data: { status: 'TRIAL', diasRestantes: 20 },
      isLoading: false,
    } as never);
    render(<LicencaTab />);

    expect(screen.getByText('Faça upgrade para continuar usando sem limites')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fazer upgrade' })).toBeInTheDocument();
  });

  it('always shows the "upgrade" card for an EXPIRADA licença', () => {
    vi.mocked(useLicencaAtual).mockReturnValue({
      data: { status: 'EXPIRADA', diasRestantes: 0 },
      isLoading: false,
    } as never);
    render(<LicencaTab />);

    expect(screen.getByText('Faça upgrade para continuar usando sem limites')).toBeInTheDocument();
  });
});
