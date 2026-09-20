import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useIniciarAssinatura, useIniciarPedido } from '@/hooks/usePagamentos';
import { carregarPagBankSdk, criptografarCartao } from '@/lib/pagbankSdk';
import { toast } from '@/store/toastStore';
import { PagamentoCartaoModal } from './PagamentoCartaoModal';

vi.mock('@/hooks/usePagamentos', () => ({
  useIniciarPedido: vi.fn(),
  useIniciarAssinatura: vi.fn(),
}));
vi.mock('@/lib/pagbankSdk', () => ({
  carregarPagBankSdk: vi.fn(),
  criptografarCartao: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderModal(props: Partial<React.ComponentProps<typeof PagamentoCartaoModal>> = {}) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <PagamentoCartaoModal open onClose={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

async function preencherFormulario() {
  await userEvent.type(screen.getByLabelText(/Nome no cartão/), 'Ana Souza');
  await userEvent.type(screen.getByLabelText(/CPF\/CNPJ do titular/), '12345678900');
  await userEvent.type(screen.getByLabelText(/Número do cartão/), '4111111111111111');
  await userEvent.type(screen.getByLabelText(/Validade/), '1228');
  await userEvent.type(screen.getByLabelText(/CVV/), '123');
}

describe('PagamentoCartaoModal', () => {
  let pedidoMutateAsync: ReturnType<typeof vi.fn>;
  let assinaturaMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pedidoMutateAsync = vi.fn().mockResolvedValue({ status: 'PENDENTE' });
    assinaturaMutateAsync = vi.fn().mockResolvedValue({ status: 'PENDENTE' });
    vi.mocked(useIniciarPedido).mockReturnValue({ mutateAsync: pedidoMutateAsync, isPending: false } as never);
    vi.mocked(useIniciarAssinatura).mockReturnValue({ mutateAsync: assinaturaMutateAsync, isPending: false } as never);
    vi.mocked(carregarPagBankSdk).mockResolvedValue(undefined);
    vi.mocked(criptografarCartao).mockReturnValue('enc_token_abc');
  });

  it('renders the security notice, the plan comparison cards, and the billing select', () => {
    renderModal();
    expect(screen.getByText(/Pagamento processado com segurança pelo PagBank/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Básico/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Premium/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Forma de cobrança/)).toBeInTheDocument();
  });

  it('formats the card number and expiry as the user types', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/Número do cartão/), '4111111111111111');
    await userEvent.type(screen.getByLabelText(/Validade/), '1228');

    expect(screen.getByLabelText(/Número do cartão/)).toHaveValue('4111 1111 1111 1111');
    expect(screen.getByLabelText(/Validade/)).toHaveValue('12/28');
  });

  it('enables the pay button with the correct amount for the default plan (PRO, assinatura)', () => {
    renderModal();
    // formatCurrency() usa toLocaleString('pt-BR'), cujo separador entre
    // "R$" e o valor é um espaço não separável (U+00A0) — regex evita
    // depender desse detalhe de encoding.
    expect(screen.getByRole('button', { name: /Pagar R\$\s*149,90/ })).toBeEnabled();
  });

  it('selects a plan by clicking its comparison card, which updates the amount charged', async () => {
    renderModal();
    const cardPremium = screen.getByRole('button', { name: /^Premium/ });
    await userEvent.click(cardPremium);

    expect(cardPremium).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Pagar R\$\s*249,90/ })).toBeInTheDocument();
  });

  it('shows the pedido (one-off) amount on the comparison cards, not the assinatura amount, when "Pagamento único" is selected', async () => {
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PEDIDO');

    // O card do plano Pro (padrão) precisa mostrar o valor avulso (189,90),
    // não o mensal (149,90) — é o mesmo valor que o botão "Pagar" vai cobrar.
    const cardPro = screen.getByRole('button', { name: /^Pro/ });
    expect(cardPro).toHaveTextContent('R$ 189,90');
    expect(cardPro).not.toHaveTextContent('R$ 149,90');
  });

  it('encrypts the card client-side and sends only the opaque token + titular data — the raw card number never leaves the encrypt step', async () => {
    renderModal();
    await preencherFormulario();
    await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

    await vi.waitFor(() => expect(assinaturaMutateAsync).toHaveBeenCalled());
    expect(criptografarCartao).toHaveBeenCalledWith({
      numero: '4111111111111111',
      nomeTitular: 'Ana Souza',
      validadeMes: '12',
      validadeAno: '2028',
      cvv: '123',
    });

    // A API de Assinaturas do PagBank exige o CVV em texto puro a cada
    // cobrança, à parte do cardToken (CVV não pode ser tokenizado para reuso
    // — regra PCI, confirmada contra o /v3/api-docs ao vivo). O número do
    // cartão em si, esse sim, nunca sai da etapa de criptografia.
    const payloadEnviado = assinaturaMutateAsync.mock.calls[0][0];
    expect(payloadEnviado).toEqual({
      plano: 'PRO',
      valorMensal: 149.9,
      cardToken: 'enc_token_abc',
      cvv: '123',
      titularNome: 'Ana Souza',
      titularCpfCnpj: '12345678900',
    });
    expect(payloadEnviado).not.toHaveProperty('numeroCartao');
  });

  it('calls iniciarPedido (not iniciarAssinatura) when "Pagamento único" is selected, and omits cvv (only assinatura needs it)', async () => {
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PEDIDO');
    await preencherFormulario();
    await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

    await vi.waitFor(() => expect(pedidoMutateAsync).toHaveBeenCalled());
    expect(assinaturaMutateAsync).not.toHaveBeenCalled();
    const payloadEnviado = pedidoMutateAsync.mock.calls[0][0];
    expect(payloadEnviado).toMatchObject({ plano: 'PRO', valor: 189.9 });
    expect(payloadEnviado).not.toHaveProperty('cvv');
    expect(payloadEnviado).not.toHaveProperty('numeroCartao');
  });

  it('shows the recusado reason and offers "Tentar novamente" instead of a false success — even on HTTP 200', async () => {
    assinaturaMutateAsync.mockResolvedValueOnce({ status: 'RECUSADO', mensagemErro: 'Saldo insuficiente.' });
    renderModal();
    await preencherFormulario();
    await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(await screen.findByText('Saldo insuficiente.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('lets the user retry after a decline without having to retype the card from scratch', async () => {
    assinaturaMutateAsync.mockResolvedValueOnce({ status: 'RECUSADO', mensagemErro: 'Cartão recusado.' });
    renderModal();
    await preencherFormulario();
    await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));
    expect(await screen.findByText('Cartão recusado.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    // Volta pro formulário; nome/CPF continuam preenchidos, cartão foi limpo.
    expect(screen.getByLabelText(/Nome no cartão/)).toHaveValue('Ana Souza');
    expect(screen.getByLabelText(/Número do cartão/)).toHaveValue('');
    expect(screen.getByLabelText(/CVV/)).toHaveValue('');
  });

  it('shows an approval confirmation for a PAGO charge', async () => {
    pedidoMutateAsync.mockResolvedValueOnce({ status: 'PAGO' });
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PEDIDO');
    await preencherFormulario();
    await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(await screen.findByText(/Pagamento aprovado/)).toBeInTheDocument();
  });
});
