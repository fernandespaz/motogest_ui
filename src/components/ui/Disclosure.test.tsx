import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Disclosure } from './Disclosure';

function Exemplo() {
  const [open, setOpen] = useState(false);
  return (
    <Disclosure title="Vistoria" summary="0 avarias" open={open} onOpenChange={setOpen}>
      <p>conteúdo pesado</p>
    </Disclosure>
  );
}

describe('Disclosure', () => {
  it('só monta o conteúdo aberto e expõe o estado por aria-expanded', async () => {
    render(<Exemplo />);
    const botao = screen.getByRole('button', { name: /Vistoria/ });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('conteúdo pesado')).not.toBeInTheDocument();
    await userEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('conteúdo pesado')).toBeInTheDocument();
  });
});
