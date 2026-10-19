import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { BaixaContaModal } from './BaixaContaModal';

const conta = { descricao: 'Aluguel de outubro', valor: 1500 };
const hoje = format(new Date(), 'yyyy-MM-dd');

describe('BaixaContaModal', () => {
  it('opens already filled with today and the value of the account, so the common case is one click', async () => {
    const onConfirm = vi.fn();
    render(<BaixaContaModal tipo="pagar" conta={conta} onConfirm={onConfirm} onClose={vi.fn()} />);

    expect(screen.getByText('Registrar pagamento')).toBeInTheDocument();
    expect(screen.getByText('Aluguel de outubro')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Data do pagamento/)).toHaveValue(hoje);
    expect(screen.getByLabelText(/^Valor pago/)).toHaveValue(1500);

    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledWith({ data: hoje, formaPagamento: undefined, valorEfetivo: 1500 });
  });

  it('says whether the amount is above (interest/fine) or below (discount) the account value', async () => {
    render(<BaixaContaModal tipo="receber" conta={conta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Registrar recebimento')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/^Valor recebido/));
    await userEvent.type(screen.getByLabelText(/^Valor recebido/), '1530');
    expect(screen.getByText(/R\$ 30,00 acima do valor da conta/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/^Valor recebido/));
    await userEvent.type(screen.getByLabelText(/^Valor recebido/), '1400');
    expect(screen.getByText(/R\$ 100,00 abaixo do valor da conta/)).toBeInTheDocument();
  });

  it('sends the chosen payment method and a past date', async () => {
    const onConfirm = vi.fn();
    render(<BaixaContaModal tipo="pagar" conta={conta} onConfirm={onConfirm} onClose={vi.fn()} />);
    const ontem = format(addDays(new Date(), -1), 'yyyy-MM-dd');

    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.clear(screen.getByLabelText(/^Data do pagamento/));
    await userEvent.type(screen.getByLabelText(/^Data do pagamento/), ontem);
    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledWith({ data: ontem, formaPagamento: 'PIX', valorEfetivo: 1500 });
  });

  it('refuses a future date and a non-positive amount', async () => {
    const onConfirm = vi.fn();
    render(<BaixaContaModal tipo="pagar" conta={conta} onConfirm={onConfirm} onClose={vi.fn()} />);

    await userEvent.clear(screen.getByLabelText(/^Data do pagamento/));
    await userEvent.type(screen.getByLabelText(/^Data do pagamento/), format(addDays(new Date(), 2), 'yyyy-MM-dd'));
    await userEvent.clear(screen.getByLabelText(/^Valor pago/));
    await userEvent.type(screen.getByLabelText(/^Valor pago/), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }));

    expect(await screen.findByText('A data não pode ser futura')).toBeInTheDocument();
    expect(screen.getByText('Informe um valor válido')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('refuses a payment date inside a closed period and offers only dates after it', async () => {
    const onConfirm = vi.fn();
    const muro = format(addDays(new Date(), -3), 'yyyy-MM-dd');
    render(<BaixaContaModal tipo="pagar" conta={conta} fechadoAte={muro} onConfirm={onConfirm} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/^Data do pagamento/)).toHaveAttribute('min', format(addDays(new Date(), -2), 'yyyy-MM-dd'));
    await userEvent.clear(screen.getByLabelText(/^Data do pagamento/));
    await userEvent.type(screen.getByLabelText(/^Data do pagamento/), muro);
    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }));

    expect(await screen.findByText(/O financeiro está fechado até/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing while there is no account', () => {
    render(<BaixaContaModal tipo="pagar" conta={null} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('Registrar pagamento')).not.toBeInTheDocument();
  });
});
