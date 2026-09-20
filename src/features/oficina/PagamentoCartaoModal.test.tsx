import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useChavePublicaPagBank, useIniciarAssinatura, useIniciarPedido, useIniciarPix } from '@/hooks/usePagamentos';
import { carregarPagBankSdk, criptografarCartao } from '@/lib/pagbankSdk';
import { toast } from '@/store/toastStore';
import { PagamentoCartaoModal } from './PagamentoCartaoModal';

vi.mock('@/hooks/usePagamentos', () => ({
  useIniciarPedido: vi.fn(),
  useIniciarAssinatura: vi.fn(),
  useIniciarPix: vi.fn(),
  useChavePublicaPagBank: vi.fn(),
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
  let pixMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pedidoMutateAsync = vi.fn().mockResolvedValue({ status: 'PENDENTE' });
    assinaturaMutateAsync = vi.fn().mockResolvedValue({ status: 'PENDENTE' });
    pixMutateAsync = vi.fn().mockResolvedValue({ status: 'PENDENTE', qrCodeText: '00020126...', qrCodeImageUrl: 'https://pagbank.example/qr.png' });
    vi.mocked(useIniciarPedido).mockReturnValue({ mutateAsync: pedidoMutateAsync, isPending: false } as never);
    vi.mocked(useIniciarAssinatura).mockReturnValue({ mutateAsync: assinaturaMutateAsync, isPending: false } as never);
    vi.mocked(useIniciarPix).mockReturnValue({ mutateAsync: pixMutateAsync, isPending: false } as never);
    vi.mocked(useChavePublicaPagBank).mockReturnValue({
      data: { chavePublica: 'chave-fake' },
      isLoading: false,
      isError: false,
    } as never);
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
    expect(criptografarCartao).toHaveBeenCalledWith('chave-fake', {
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

  it('never shows a raw upstream error dump to the user, even when the backend leaks one in mensagemErro (regressão)', async () => {
    // Cenário real observado em produção: falha de credencial do PagBank no
    // lado do backend vazou como texto bruto no mensagemErro de um RECUSADO.
    assinaturaMutateAsync.mockResolvedValueOnce({
      status: 'RECUSADO',
      mensagemErro:
        'Falha ao comunicar com o PagBank: 401 Unauthorized: "{"error_messages":[{"code":"UNAUTHORIZED","description":"Invalid credential. Review AUTHORIZATION header"}]}"',
    });
    renderModal();
    await preencherFormulario();
    await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(
      await screen.findByText('O pagamento não foi aprovado. Confira os dados do cartão e tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/error_messages/)).not.toBeInTheDocument();
    expect(screen.queryByText(/UNAUTHORIZED/)).not.toBeInTheDocument();
    expect(screen.queryByText(/401/)).not.toBeInTheDocument();
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

  describe('loading state while a payment is in flight', () => {
    // Congela a mutation em "pendente" de propósito (nunca resolve dentro do
    // teste) para conseguir capturar a tela exatamente durante o
    // processamento — o resto dos testes usa mocks que resolvem na hora, então
    // nunca ficam tempo suficiente nesse estado para verificá-lo.
    function segurarPendente() {
      return new Promise(() => {});
    }

    it('shows a spinner and a reassuring message instead of a blank-feeling screen (cartão/assinatura)', async () => {
      assinaturaMutateAsync.mockImplementationOnce(segurarPendente);
      renderModal();
      await preencherFormulario();
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

      expect(await screen.findByText('Processando pagamento com segurança...')).toBeInTheDocument();
      expect(screen.getByText(/não feche esta janela/i)).toBeInTheDocument();
      // Os campos do formulário somem enquanto processa — nada de cliques ou
      // edição durante o envio.
      expect(screen.queryByLabelText(/Nome no cartão/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Básico/ })).not.toBeInTheDocument();
    });

    it('shows a Pix-specific loading message ("Gerando seu Pix...")', async () => {
      pixMutateAsync.mockImplementationOnce(segurarPendente);
      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

      expect(await screen.findByText('Gerando seu Pix...')).toBeInTheDocument();
    });

    it('shows the spinner already during client-side card encryption, before the network call even starts', async () => {
      // criptografarCartao é síncrona, mas carregarPagBankSdk() é aguardada
      // antes dela — segurando essa promise já basta pra cair no estado
      // "processando" antes de qualquer chamada à API de pagamentos.
      vi.mocked(carregarPagBankSdk).mockImplementationOnce(segurarPendente as never);
      renderModal();
      await preencherFormulario();
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

      expect(await screen.findByText('Processando pagamento com segurança...')).toBeInTheDocument();
      expect(assinaturaMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('disables the pay button while the chave pública is still loading (cartão)', () => {
    vi.mocked(useChavePublicaPagBank).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never);
    renderModal();
    expect(screen.getByRole('button', { name: /^Pagar/ })).toBeDisabled();
  });

  it('does not wait on the chave pública for Pix, which never touches the card SDK', async () => {
    vi.mocked(useChavePublicaPagBank).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never);
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
    expect(screen.getByRole('button', { name: /^Pagar/ })).toBeEnabled();
  });

  it('shows a clear warning and disables the pay button when the chave pública fails to load (cartão)', () => {
    vi.mocked(useChavePublicaPagBank).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    renderModal();

    expect(screen.getByText(/Pagamento por cartão temporariamente indisponível/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pagar/ })).toBeDisabled();
  });

  it('lets Pix go through even when the chave pública failed — Pix never needs it', async () => {
    vi.mocked(useChavePublicaPagBank).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');

    expect(screen.queryByText(/Pagamento por cartão temporariamente indisponível/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pagar/ })).toBeEnabled();
  });

  describe('Pix', () => {
    it('hides every card field once "Pix" is selected', async () => {
      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');

      expect(screen.queryByLabelText(/Nome no cartão/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/CPF\/CNPJ do titular/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Número do cartão/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Validade/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/CVV/)).not.toBeInTheDocument();
      expect(screen.getByText(/nenhum dado de cartão é necessário/)).toBeInTheDocument();
    });

    it('charges the one-off (avulso) amount for Pix, same as pedido', async () => {
      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
      expect(screen.getByRole('button', { name: /Pagar R\$\s*189,90/ })).toBeEnabled();
    });

    it('calls iniciarPix with only plano + valor — no card data, no encryption step', async () => {
      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

      await vi.waitFor(() => expect(pixMutateAsync).toHaveBeenCalledWith({ plano: 'PRO', valor: 189.9 }));
      expect(criptografarCartao).not.toHaveBeenCalled();
      expect(carregarPagBankSdk).not.toHaveBeenCalled();
      expect(assinaturaMutateAsync).not.toHaveBeenCalled();
      expect(pedidoMutateAsync).not.toHaveBeenCalled();
    });

    it('shows a Pix-specific decline message, not the card-worded fallback (regressão)', async () => {
      pixMutateAsync.mockResolvedValueOnce({ status: 'RECUSADO' });
      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

      expect(await screen.findByText('O pagamento via Pix não foi aprovado. Tente novamente.')).toBeInTheDocument();
      expect(screen.queryByText(/dados do cartão/)).not.toBeInTheDocument();
    });

    it('shows the QR code image and a copyable "copia e cola" code while PENDENTE', async () => {
      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));

      expect(await screen.findByAltText('QR Code para pagamento via Pix')).toHaveAttribute(
        'src',
        'https://pagbank.example/qr.png',
      );
      expect(screen.getByText('00020126...')).toBeInTheDocument();
      expect(screen.getByText(/Escaneie o QR Code ou copie o código acima/)).toBeInTheDocument();
    });

    it('copies the Pix code to the clipboard when the copy button is clicked', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      renderModal();
      await userEvent.selectOptions(screen.getByLabelText(/Forma de cobrança/), 'PIX');
      await userEvent.click(screen.getByRole('button', { name: /^Pagar/ }));
      await screen.findByAltText('QR Code para pagamento via Pix');

      await userEvent.click(screen.getByRole('button', { name: 'Copiar código Pix' }));
      expect(writeText).toHaveBeenCalledWith('00020126...');
      expect(toast.success).toHaveBeenCalledWith('Código Pix copiado.');
    });
  });
});
